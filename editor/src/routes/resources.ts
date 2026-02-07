import { Hono } from 'hono';
import { readdir, mkdir } from 'fs/promises';
import { readFile, writeFile, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { BUNDLES_DIR } from '../config';
import { readYamlFile, writeYamlFile, readJsonFile, writeJsonFile } from '../utils/fileUtils';

const resources = new Hono();

// Helper function to create routes for a simple JS file resource
function createJsResourceRoutes(resourceType: string) {
  const routes = new Hono();
  
  routes.get(`/:bundleName/${resourceType}`, async (c) => {
    try {
      const bundleName = c.req.param('bundleName');
      const resourcePath = join(BUNDLES_DIR, bundleName, resourceType);
      
      const files = await readdir(resourcePath, { withFileTypes: true });
      const list = files
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.js'))
        .map(dirent => dirent.name.replace('.js', ''));
      
      return c.json({ [resourceType]: list });
    } catch (error) {
      return c.json({ error: String(error) }, 500);
    }
  });
  
  routes.get(`/:bundleName/${resourceType}/:name`, async (c) => {
    try {
      const bundleName = c.req.param('bundleName');
      const name = c.req.param('name');
      const filePath = join(BUNDLES_DIR, bundleName, resourceType, `${name}.js`);
      
      const content = await readFile(filePath, 'utf-8');
      const resourceKey = resourceType === 'classes' ? 'class' : 
                         resourceType === 'root-files' ? 'file' :
                         resourceType.replace(/s$/, '');
      return c.json({ [resourceKey]: { 
        ...(resourceType === 'classes' ? { id: name } : { name }),
        content 
      }});
    } catch (error) {
      return c.json({ error: String(error) }, 500);
    }
  });
  
  routes.post(`/:bundleName/${resourceType}/:name`, async (c) => {
    try {
      const bundleName = c.req.param('bundleName');
      const name = c.req.param('name');
      const resourceData = await c.req.json();
      const filePath = join(BUNDLES_DIR, bundleName, resourceType, `${name}.js`);
      
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, resourceData.content, 'utf-8');
      const resourceKey = resourceType === 'classes' ? 'class' : 
                         resourceType === 'root-files' ? 'file' :
                         resourceType.replace(/s$/, '');
      return c.json({ success: true, [resourceKey]: resourceData });
    } catch (error) {
      return c.json({ error: String(error) }, 500);
    }
  });
  
  return routes;
}

// Classes
const classesRoutes = createJsResourceRoutes('classes');
resources.route('/', classesRoutes);

// Commands
const commandsRoutes = createJsResourceRoutes('commands');
resources.route('/', commandsRoutes);

// Effects
const effectsRoutes = createJsResourceRoutes('effects');
resources.route('/', effectsRoutes);

// Skills
const skillsRoutes = createJsResourceRoutes('skills');
resources.route('/', skillsRoutes);

// Root files (special handling for .js extension check)
resources.get('/:bundleName/root-files', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const bundlePath = join(BUNDLES_DIR, bundleName);
    
    const allFiles = await readdir(bundlePath, { withFileTypes: true });
    const rootFiles = allFiles
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.js'))
      .map(dirent => dirent.name);
    
    return c.json({ rootFiles });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

resources.get('/:bundleName/root-files/:fileName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const fileName = c.req.param('fileName');
    const filePath = join(BUNDLES_DIR, bundleName, fileName);
    
    if (!fileName.endsWith('.js')) {
      return c.json({ error: 'Only .js files are allowed' }, 400);
    }
    
    const content = await readFile(filePath, 'utf-8');
    return c.json({ file: { name: fileName, content } });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

resources.post('/:bundleName/root-files/:fileName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const fileName = c.req.param('fileName');
    const fileData = await c.req.json();
    const filePath = join(BUNDLES_DIR, bundleName, fileName);
    
    if (!fileName.endsWith('.js')) {
      return c.json({ error: 'Only .js files are allowed' }, 400);
    }
    
    await writeFile(filePath, fileData.content, 'utf-8');
    return c.json({ success: true, file: fileData });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Behaviors (nested structure)
resources.get('/:bundleName/behaviors', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const behaviorsPath = join(BUNDLES_DIR, bundleName, 'behaviors');
    
    const behaviors: { type: string; name: string }[] = [];
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
    
    return c.json({ behaviors });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

resources.get('/:bundleName/behaviors/:behaviorType/:behaviorName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const behaviorType = c.req.param('behaviorType');
    const behaviorName = c.req.param('behaviorName');
    const filePath = join(BUNDLES_DIR, bundleName, 'behaviors', behaviorType, `${behaviorName}.js`);
    const examplePath = join(BUNDLES_DIR, bundleName, 'behaviors', behaviorType, `${behaviorName}.example.yml`);
    const content = await readFile(filePath, 'utf-8');
    let exampleConfig: string | undefined;
    try {
      exampleConfig = await readFile(examplePath, 'utf-8');
    } catch {
      // no example file
    }
    return c.json({ behavior: { type: behaviorType, name: behaviorName, content, exampleConfig } });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

resources.post('/:bundleName/behaviors/:behaviorType/:behaviorName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const behaviorType = c.req.param('behaviorType');
    const behaviorName = c.req.param('behaviorName');
    const behaviorData = await c.req.json();
    const filePath = join(BUNDLES_DIR, bundleName, 'behaviors', behaviorType, `${behaviorName}.js`);
    const examplePath = join(BUNDLES_DIR, bundleName, 'behaviors', behaviorType, `${behaviorName}.example.yml`);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, behaviorData.content ?? '', 'utf-8');
    if (typeof behaviorData.exampleConfig === 'string') {
      if (behaviorData.exampleConfig.trim() === '') {
        try { await unlink(examplePath); } catch { /* ignore */ }
      } else {
        await writeFile(examplePath, behaviorData.exampleConfig, 'utf-8');
      }
    }
    return c.json({ success: true, behavior: behaviorData });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

resources.delete('/:bundleName/behaviors/:behaviorType/:behaviorName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const behaviorType = c.req.param('behaviorType');
    const behaviorName = c.req.param('behaviorName');
    const filePath = join(BUNDLES_DIR, bundleName, 'behaviors', behaviorType, `${behaviorName}.js`);
    const examplePath = join(BUNDLES_DIR, bundleName, 'behaviors', behaviorType, `${behaviorName}.example.yml`);
    await unlink(filePath);
    try { await unlink(examplePath); } catch { /* ignore */ }
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Lib files
const libRoutes = createJsResourceRoutes('lib');
resources.route('/', libRoutes);

// Quest goals
const questGoalsRoutes = createJsResourceRoutes('quest-goals');
resources.route('/', questGoalsRoutes);

// Quest rewards
const questRewardsRoutes = createJsResourceRoutes('quest-rewards');
resources.route('/', questRewardsRoutes);

// Input events
const inputEventsRoutes = createJsResourceRoutes('input-events');
resources.route('/', inputEventsRoutes);

// Server events
const serverEventsRoutes = createJsResourceRoutes('server-events');
resources.route('/', serverEventsRoutes);

// Help files (YAML)
resources.get('/:bundleName/help', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const helpPath = join(BUNDLES_DIR, bundleName, 'help');
    
    const helpFiles = await readdir(helpPath, { withFileTypes: true });
    const helpList = helpFiles
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.yml'))
      .map(dirent => dirent.name.replace('.yml', ''));
    
    return c.json({ helpFiles: helpList });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

resources.get('/:bundleName/help/:helpName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const helpName = c.req.param('helpName');
    const filePath = join(BUNDLES_DIR, bundleName, 'help', `${helpName}.yml`);
    
    const content = await readYamlFile(filePath);
    return c.json({ help: { name: helpName, content } });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

resources.post('/:bundleName/help/:helpName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const helpName = c.req.param('helpName');
    const helpData = await c.req.json();
    const filePath = join(BUNDLES_DIR, bundleName, 'help', `${helpName}.yml`);
    
    await mkdir(dirname(filePath), { recursive: true });
    await writeYamlFile(filePath, helpData.content);
    return c.json({ success: true, help: helpData });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// JSON files
resources.get('/:bundleName/json-files', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const bundlePath = join(BUNDLES_DIR, bundleName);
    
    let jsonFiles: { type: string; name: string }[] = [];
    
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
    
    return c.json({ jsonFiles });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

resources.get('/:bundleName/json-files/:type/:fileName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const type = c.req.param('type');
    const fileName = c.req.param('fileName');
    
    let filePath: string;
    if (type === 'root') {
      filePath = join(BUNDLES_DIR, bundleName, fileName);
    } else if (type === 'data') {
      filePath = join(BUNDLES_DIR, bundleName, 'data', fileName);
    } else {
      return c.json({ error: 'Invalid type' }, 400);
    }
    
    const content = await readJsonFile(filePath);
    return c.json({ jsonFile: { type, name: fileName, content } });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

resources.post('/:bundleName/json-files/:type/:fileName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const type = c.req.param('type');
    const fileName = c.req.param('fileName');
    const jsonData = await c.req.json();
    
    let filePath: string;
    if (type === 'root') {
      filePath = join(BUNDLES_DIR, bundleName, fileName);
    } else if (type === 'data') {
      filePath = join(BUNDLES_DIR, bundleName, 'data', fileName);
    } else {
      return c.json({ error: 'Invalid type' }, 400);
    }
    
    await mkdir(dirname(filePath), { recursive: true });
    await writeJsonFile(filePath, jsonData.content);
    return c.json({ success: true, jsonFile: jsonData });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Scripts (nested structure)
resources.get('/:bundleName/scripts', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const scriptsPath = join(BUNDLES_DIR, bundleName, 'scripts');
    
    const scripts: { type: string; name: string }[] = [];
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
    
    return c.json({ scripts });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

resources.get('/:bundleName/scripts/:type/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const type = c.req.param('type');
    const scriptName = c.req.param('scriptName');
    const filePath = join(BUNDLES_DIR, bundleName, 'scripts', type, `${scriptName}.js`);
    
    const content = await readFile(filePath, 'utf-8');
    return c.json({ script: { type, name: scriptName, content } });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

resources.post('/:bundleName/scripts/:type/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const type = c.req.param('type');
    const scriptName = c.req.param('scriptName');
    const scriptData = await c.req.json();
    const filePath = join(BUNDLES_DIR, bundleName, 'scripts', type, `${scriptName}.js`);
    
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, scriptData.content, 'utf-8');
    return c.json({ success: true, script: scriptData });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

resources.delete('/:bundleName/scripts/:type/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const type = c.req.param('type');
    const scriptName = c.req.param('scriptName');
    const filePath = join(BUNDLES_DIR, bundleName, 'scripts', type, `${scriptName}.js`);
    
    await unlink(filePath);
    return c.json({ success: true });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return c.json({ success: true }); // Already deleted
    }
    return c.json({ error: String(error) }, 500);
  }
});

export default resources;
