import yaml from 'js-yaml';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

export async function readYamlFile(filePath: string): Promise<any> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return yaml.load(content);
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code !== 'ENOENT') {
      console.error(`Error reading YAML file ${filePath}:`, error);
    }
    throw error;
  }
}

export async function writeYamlFile(filePath: string, data: any): Promise<void> {
  try {
    const content = yaml.dump(data, { indent: 2, lineWidth: -1 });
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`Error writing YAML file ${filePath}:`, error);
    throw error;
  }
}

export async function readJsonFile(filePath: string): Promise<any> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    throw error;
  }
}

export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  try {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing JSON file ${filePath}:`, error);
    throw error;
  }
}
