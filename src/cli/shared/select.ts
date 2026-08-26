import { createInterface } from 'node:readline/promises';
import type { CatalogSearchResult } from '../../agent/catalog/providers/index.ts';

function formatInstalls(value?: number): string {
  return value ? ` · ${value.toLocaleString('en-US')} installs` : '';
}

export async function selectCatalogResult(results: CatalogSearchResult[]): Promise<CatalogSearchResult | null> {
  if (results.length === 0) {
    return null;
  }

  console.log('Resultados disponíveis:\n');
  results.forEach((result, index) => {
    console.log(`${index + 1}) ${result.displayName} (${result.source})${formatInstalls(result.installs)}`);
    if (result.description) {
      console.log(`   ${result.description}`);
    }
  });

  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      const answer = await input.question(`\nEscolha uma opção (1-${results.length}, 0 para cancelar): `);
      const choice = Number(answer.trim());
      if (choice === 0) {
        return null;
      }
      if (Number.isInteger(choice) && choice >= 1 && choice <= results.length) {
        return results[choice - 1];
      }
      console.log(`Opção inválida. Digite um número entre 1 e ${results.length}.`);
    }
  } finally {
    input.close();
  }
}
