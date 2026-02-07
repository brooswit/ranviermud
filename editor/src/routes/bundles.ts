import { Hono } from 'hono';
import { readdir, stat, mkdir } from 'fs/promises';
import { join } from 'path';
import { BUNDLES_DIR, RANVIER_JSON } from '../config';
import { readJsonFile, writeJsonFile, writeYamlFile } from '../utils/fileUtils';

const bundles = new Hono();

// Get all bundles
bundles.get('/', async (c) => {
  try {
    const bundleDirs = await readdir(BUNDLES_DIR, { withFileTypes: true });
    const bundleList = bundleDirs
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    // Get active bundles from ranvier.json
    const ranvierConfig = await readJsonFile(RANVIER_JSON);
    const activeBundles = ranvierConfig.bundles || [];
    
    // Return bundles with active status
    const bundlesWithStatus = bundleList.map(bundle => ({
      name: bundle,
      active: activeBundles.includes(bundle)
    }));
    
    return c.json({ bundles: bundlesWithStatus });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Get bundle info
bundles.get('/:bundleName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const bundlePath = join(BUNDLES_DIR, bundleName);
    
    const stats = await stat(bundlePath);
    if (!stats.isDirectory()) {
      return c.json({ error: 'Bundle not found' }, 404);
    }

    // Helper to check directory for files
    const checkDirectory = async (dirPath: string, extension: string = '.js'): Promise<string[]> => {
      try {
        const files = await readdir(dirPath, { withFileTypes: true });
        return files
          .filter(dirent => dirent.isFile() && dirent.name.endsWith(extension))
          .map(dirent => dirent.name.replace(extension, ''));
      } catch {
        return [];
      }
    };

    // Check for areas
    const areasPath = join(bundlePath, 'areas');
    let areas: string[] = [];
    try {
      const areaDirs = await readdir(areasPath, { withFileTypes: true });
      areas = areaDirs
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    } catch {
      // No areas directory
    }

    // Check for classes
    const classes = await checkDirectory(join(bundlePath, 'classes'));

    // Check for behaviors (nested structure)
    const behaviorsPath = join(bundlePath, 'behaviors');
    let behaviors: { type: string; name: string }[] = [];
    try {
      const behaviorDirs = await readdir(behaviorsPath, { withFileTypes: true });
      for (const behaviorDir of behaviorDirs) {
        if (behaviorDir.isDirectory()) {
          const behaviorTypePath = join(behaviorsPath, behaviorDir.name);
          const behaviorFiles = await readdir(behaviorTypePath, { withFileTypes: true });
          behaviorFiles
            .filter(dirent => dirent.isFile() && dirent.name.endsWith('.js'))
            .forEach(dirent => {
              behaviors.push({
                type: behaviorDir.name,
                name: dirent.name.replace('.js', '')
              });
            });
        }
      }
    } catch {
      // No behaviors directory
    }

    const commands = await checkDirectory(join(bundlePath, 'commands'));
    const effects = await checkDirectory(join(bundlePath, 'effects'));
    const skills = await checkDirectory(join(bundlePath, 'skills'));
    const libFiles = await checkDirectory(join(bundlePath, 'lib'));
    const questGoals = await checkDirectory(join(bundlePath, 'quest-goals'));
    const questRewards = await checkDirectory(join(bundlePath, 'quest-rewards'));
    const inputEvents = await checkDirectory(join(bundlePath, 'input-events'));
    const serverEvents = await checkDirectory(join(bundlePath, 'server-events'));
    const helpFiles = await checkDirectory(join(bundlePath, 'help'), '.yml');

    // Check for root JS files
    let rootFiles: string[] = [];
    try {
      const allFiles = await readdir(bundlePath, { withFileTypes: true });
      rootFiles = allFiles
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.js'))
        .map(dirent => dirent.name);
    } catch {
      // Error reading bundle directory
    }

    // Check for JSON files
    let jsonFiles: { type: string; name: string }[] = [];
    try {
      const allFiles = await readdir(bundlePath, { withFileTypes: true });
      allFiles
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
        .forEach(dirent => {
          jsonFiles.push({ type: 'root', name: dirent.name });
        });

      const dataPath = join(bundlePath, 'data');
      try {
        const dataFiles = await readdir(dataPath, { withFileTypes: true });
        dataFiles
          .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
          .forEach(dirent => {
            jsonFiles.push({ type: 'data', name: dirent.name });
          });
      } catch {
        // No data directory
      }
    } catch {
      // Error reading files
    }

    // Check for scripts
    const scriptsPath = join(bundlePath, 'scripts');
    let scripts: { type: string; name: string }[] = [];
    try {
      const scriptDirs = await readdir(scriptsPath, { withFileTypes: true });
      for (const scriptDir of scriptDirs) {
        if (scriptDir.isDirectory()) {
          const scriptTypePath = join(scriptsPath, scriptDir.name);
          const scriptFiles = await readdir(scriptTypePath, { withFileTypes: true });
          scriptFiles
            .filter(dirent => dirent.isFile() && dirent.name.endsWith('.js'))
            .forEach(dirent => {
              scripts.push({
                type: scriptDir.name,
                name: dirent.name.replace('.js', '')
              });
            });
        }
      }
    } catch {
      // No scripts directory
    }

    return c.json({ 
      name: bundleName,
      path: bundlePath,
      areas,
      classes,
      behaviors,
      commands,
      effects,
      skills,
      rootFiles,
      libFiles,
      questGoals,
      questRewards,
      inputEvents,
      serverEvents,
      helpFiles,
      jsonFiles,
      scripts
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Create new bundle
bundles.post('/', async (c) => {
  try {
    const { name } = await c.req.json();
    if (!name || !/^[a-z0-9-]+$/.test(name)) {
      return c.json({ error: 'Invalid bundle name' }, 400);
    }

    const bundlePath = join(BUNDLES_DIR, name);
    await mkdir(bundlePath, { recursive: true });
    
    // Create package.json
    await writeJsonFile(join(bundlePath, 'package.json'), {
      name: `bundle-${name}`,
      version: '1.0.0'
    });

    // Update ranvier.json
    const ranvierConfig = await readJsonFile(RANVIER_JSON);
    if (!ranvierConfig.bundles.includes(name)) {
      ranvierConfig.bundles.push(name);
      await writeJsonFile(RANVIER_JSON, ranvierConfig);
    }

    return c.json({ success: true, bundle: { name } });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Toggle bundle active/inactive
bundles.patch('/:bundleName/toggle', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const ranvierConfig = await readJsonFile(RANVIER_JSON);
    
    if (!ranvierConfig.bundles) {
      ranvierConfig.bundles = [];
    }
    
    const index = ranvierConfig.bundles.indexOf(bundleName);
    if (index > -1) {
      // Remove from active bundles
      ranvierConfig.bundles.splice(index, 1);
    } else {
      // Add to active bundles
      ranvierConfig.bundles.push(bundleName);
    }
    
    await writeJsonFile(RANVIER_JSON, ranvierConfig);
    
    return c.json({ 
      success: true, 
      active: index === -1,
      bundle: { name: bundleName }
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

export default bundles;
