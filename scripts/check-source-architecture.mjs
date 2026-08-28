import path from 'node:path';
import {
  isArrowFunction,
  isClassDeclaration,
  isConstructorDeclaration,
  isEnumDeclaration,
  isExportDeclaration,
  isFunctionDeclaration,
  isFunctionExpression,
  isGetAccessorDeclaration,
  isInterfaceDeclaration,
  isMethodDeclaration,
  isMethodSignatureDeclaration,
  isPropertyDeclaration,
  isSetAccessorDeclaration,
  isTypeAliasDeclaration,
  isVariableStatement,
} from 'typescript/unstable/ast';
import { API } from 'typescript/unstable/sync';

const rootDir = process.cwd();
const sourceRoot = path.join(rootDir, 'src');

/** Returns whether a top-level statement defines an independently owned source symbol. */
function isArchitecturalSymbol(statement) {
  if (
    isFunctionDeclaration(statement)
    || isClassDeclaration(statement)
    || isInterfaceDeclaration(statement)
    || isTypeAliasDeclaration(statement)
    || isEnumDeclaration(statement)
  ) {
    return true;
  }
  if (!isVariableStatement(statement)) return false;
  return statement.declarationList.declarations.some((declaration) => (
    declaration.initializer
    && (isArrowFunction(declaration.initializer) || isFunctionExpression(declaration.initializer))
  ));
}

/** Returns whether a class or interface member represents callable behavior. */
function isDocumentedMember(member) {
  return isConstructorDeclaration(member)
    || isMethodDeclaration(member)
    || isMethodSignatureDeclaration(member)
    || isGetAccessorDeclaration(member)
    || isSetAccessorDeclaration(member)
    || (isPropertyDeclaration(member)
      && member.initializer
      && (isArrowFunction(member.initializer) || isFunctionExpression(member.initializer)));
}

/** Checks for a JSDoc block directly attached to an AST node. */
function hasJsDoc(node, sourceFile) {
  return sourceFile.text.slice(node.pos, node.getStart(sourceFile)).includes('/**');
}

/** Produces a readable declaration name for architecture errors. */
function declarationName(node, sourceFile) {
  if (isVariableStatement(node)) {
    return node.declarationList.declarations.map((declaration) => declaration.name.getText(sourceFile)).join(', ');
  }
  return node.name?.getText(sourceFile) ?? 'anonymous';
}

const api = new API({ cwd: rootDir });
const snapshot = api.updateSnapshot({ openProjects: ['tsconfig.json'] });
const project = snapshot.getProjects()[0];
const errors = [];

for (const sourceFileName of project.program.getSourceFileNames()) {
  const filePath = path.resolve(sourceFileName);
  if (!filePath.startsWith(`${sourceRoot}${path.sep}`) || filePath.endsWith('.d.ts')) continue;
  const sourceFile = project.program.getSourceFile(filePath);
  if (!sourceFile) continue;
  const relativePath = path.relative(rootDir, filePath);
  const symbols = sourceFile.statements.filter(isArchitecturalSymbol);

  if (symbols.length > 1) {
    errors.push(`${relativePath}: owns ${symbols.length} symbols (${symbols.map((node) => declarationName(node, sourceFile)).join(', ')})`);
  }

  for (const symbol of symbols) {
    if (!hasJsDoc(symbol, sourceFile)) {
      errors.push(`${relativePath}: ${declarationName(symbol, sourceFile)} is missing JSDoc`);
    }
  }

  for (const statement of sourceFile.statements) {
    if (isExportDeclaration(statement) && statement.moduleSpecifier) {
      errors.push(`${relativePath}: re-exports are forbidden; import declarations directly from their owner files`);
    }
    if (!isClassDeclaration(statement) && !isInterfaceDeclaration(statement)) continue;
    if (isClassDeclaration(statement) && statement.heritageClauses?.length && statement.members.length === 0) {
      errors.push(`${relativePath}: empty subclass shims are forbidden; use the concrete class directly`);
    }
    for (const member of statement.members) {
      if (!isDocumentedMember(member) || hasJsDoc(member, sourceFile)) continue;
      const memberName = isConstructorDeclaration(member)
        ? 'constructor'
        : member.name?.getText(sourceFile) ?? 'anonymous member';
      errors.push(`${relativePath}: ${declarationName(statement, sourceFile)}.${memberName} is missing JSDoc`);
    }
  }
}

snapshot.dispose();
api.close();

if (errors.length > 0) {
  console.error('Source architecture violations:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Source architecture is valid: direct imports, one named symbol per file, and JSDoc coverage.');
