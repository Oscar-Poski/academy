import { applyParsedContentReport, createDryRunApplyReport } from './apply';
import { parseContentBundle } from './importer';

type CliOptions = {
  root: string;
  apply: boolean;
  pretty: boolean;
  strict: boolean;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const parseReport = await parseContentBundle(options.root);
  const report = options.apply
    ? await applyParsedContentReport(parseReport)
    : createDryRunApplyReport(parseReport);
  const spacing = options.pretty ? 2 : 0;
  process.stdout.write(`${JSON.stringify(report, null, spacing)}\n`);

  if (options.strict && parseReport.errorCount > 0) {
    process.exitCode = 1;
  }

  if (options.apply && report.abortedReason === 'parse_errors') {
    process.exitCode = 1;
  }
}

function parseArgs(args: string[]): CliOptions {
  let root: string | null = null;
  let apply = false;
  let pretty = true;
  let strict = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--root') {
      root = args[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg.startsWith('--root=')) {
      root = arg.slice('--root='.length);
      continue;
    }

    if (arg === '--pretty') {
      pretty = true;
      continue;
    }

    if (arg === '--apply') {
      apply = true;
      continue;
    }

    if (arg === '--strict') {
      strict = true;
      continue;
    }

    if (arg === '--pretty=false') {
      pretty = false;
      continue;
    }

    if (arg === '--pretty=true') {
      pretty = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!root || root.trim().length === 0) {
    throw new Error('Missing required --root <path>');
  }

  return { root, apply, pretty, strict };
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
