import Ajv from "ajv";
import addFormats from "ajv-formats";
import * as yaml from "yaml";
import * as fs from "fs";
import * as path from "path";

export function validateAsyncAPISchema(filePath: string): string[] {
  const fileContent = fs.readFileSync(filePath, "utf8");

  let parsedDoc: any;
  try {
    parsedDoc = yaml.parse(fileContent);
  } catch (err: any) {
    return [`YAML parse error: ${err.message}`];
  }

  const schemaPath = path.join(__dirname, "asyncapi-schema.json");
  const schemaContent = fs.readFileSync(schemaPath, "utf8");
  const asyncapiSchema = JSON.parse(schemaContent);

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const validate = ajv.compile(asyncapiSchema);
  const valid = validate(parsedDoc);

  if (!valid && validate.errors) {
    return validate.errors.map((err) => {
      return `Path: ${err.instancePath || '/'} — ${err.message}`;
    });
  }

  return [];
}