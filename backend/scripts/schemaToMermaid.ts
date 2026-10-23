interface Field {
  name: string;
  type: string;
  isList: boolean;
  isOptional: boolean;
  attributes: string;
}

interface Model {
  name: string;
  table: string;
  fields: Field[];
}

const PRISMA_TO_SQL: Record<string, string> = {
  String: 'text',
  Int: 'int',
  BigInt: 'bigint',
  Float: 'float',
  Boolean: 'boolean',
  DateTime: 'timestamp',
  Json: 'jsonb',
  Decimal: 'numeric',
  Bytes: 'bytea',
};

const stripComments = (text: string) => text.replace(/\/\/.*$/gm, '');

const mappedName = (body: string, fallback: string) =>
  body.match(/@@map\("([^"]+)"\)/)?.[1] ?? fallback;

// `prisma format` always puts the closing brace of a block at the start of a line.
function blocks(schema: string, keyword: 'model' | 'enum') {
  const pattern = new RegExp(`^${keyword}\\s+(\\w+)\\s*\\{([\\s\\S]*?)^\\}`, 'gm');
  return [...stripComments(schema).matchAll(pattern)].map((m) => ({
    name: m[1] as string,
    body: m[2] as string,
  }));
}

function parseFields(body: string): Field[] {
  const fields: Field[] = [];
  for (const line of body.split('\n')) {
    const match = line.match(/^\s*(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/);
    if (!match) continue; // blank lines and @@attributes
    fields.push({
      name: match[1] as string,
      type: match[2] as string,
      isList: Boolean(match[3]),
      isOptional: Boolean(match[4]),
      attributes: match[5] ?? '',
    });
  }
  return fields;
}

function sqlType(field: Field, enumTables: Map<string, string>): string {
  const db = field.attributes.match(/@db\.(\w+)(?:\(([^)]*)\))?/);
  if (db)
    return `${(db[1] as string).toLowerCase()}${db[2] ? `(${db[2].replaceAll(' ', '')})` : ''}`;
  return enumTables.get(field.type) ?? PRISMA_TO_SQL[field.type] ?? field.type.toLowerCase();
}

const foreignKeyColumns = (model: Model) =>
  model.fields.flatMap((f) => {
    const list = f.attributes.match(/fields:\s*\[([^\]]*)\]/)?.[1];
    return list ? list.split(',').map((name) => name.trim()) : [];
  });

/** Builds a Mermaid `erDiagram` from the text of a Prisma schema. */
export function schemaToMermaid(schema: string): string {
  const enumTables = new Map(
    blocks(schema, 'enum').map((e) => [e.name, mappedName(e.body, e.name)]),
  );
  const models: Model[] = blocks(schema, 'model').map((m) => ({
    name: m.name,
    table: mappedName(m.body, m.name),
    fields: parseFields(m.body),
  }));
  const modelNames = new Set(models.map((m) => m.name));
  const tableOf = new Map(models.map((m) => [m.name, m.table]));

  const lines = ['erDiagram'];

  for (const model of models) {
    const foreignKeys = new Set(foreignKeyColumns(model));
    lines.push(`  ${model.table} {`);
    for (const field of model.fields) {
      if (modelNames.has(field.type)) continue; // a relation, not a column
      const keys = [
        field.attributes.includes('@id') && 'PK',
        foreignKeys.has(field.name) && 'FK',
        /@unique\b/.test(field.attributes) && 'UK',
      ].filter(Boolean);
      const parts = [sqlType(field, enumTables), field.name];
      if (keys.length > 0) parts.push(keys.join(', '));
      if (field.isOptional) parts.push('"opcional"');
      lines.push(`    ${parts.join(' ')}`);
    }
    lines.push('  }');
  }

  for (const model of models) {
    const uniqueColumns = new Set(
      model.fields.filter((f) => /@unique\b/.test(f.attributes)).map((f) => f.name),
    );
    for (const field of model.fields) {
      const foreignKey = field.attributes.match(/fields:\s*\[\s*(\w+)\s*\]/)?.[1];
      if (!foreignKey || !modelNames.has(field.type)) continue;
      const parent = tableOf.get(field.type) as string;
      const parentSide = field.isOptional ? '|o' : '||';
      const childSide = uniqueColumns.has(foreignKey) ? 'o|' : 'o{';
      lines.push(`  ${parent} ${parentSide}--${childSide} ${model.table} : "${foreignKey}"`);
    }
  }

  return lines.join('\n');
}

/** The enums of a Prisma schema: the type name in the database and its values. */
export function listEnums(schema: string): { table: string; values: string[] }[] {
  return blocks(schema, 'enum').map((e) => ({
    table: mappedName(e.body, e.name),
    values: e.body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^\w+$/.test(line)),
  }));
}
