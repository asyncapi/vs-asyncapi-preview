import * as vscode from 'vscode';
import { ExtensionConfig, getConfig } from './config';
import { hostOfUrl } from './loaderMatch';
import { Logger } from './logger';
import { plaintextCredentialFields, referencedSecretKeys, secretKeysForUrl } from './secretSettings';

const SECRET_KEYS_STATE = 'asyncapi.secretKeys';
const PLAINTEXT_WARNED_STATE = 'asyncapi.warnedPlaintextAuth';

export function registerSecretCommands(
  context: vscode.ExtensionContext,
  options: {
    canManageSecrets: () => boolean;
    onSecretsChanged: () => void;
  }
): vscode.Disposable {
  return vscode.Disposable.from(
    vscode.commands.registerCommand('asyncapi.setSecret', async () => {
      if (!options.canManageSecrets()) {
        return;
      }
      const saved = await runSetSecretCommand(context, {
        resource: activeResource(),
        canManageSecrets: options.canManageSecrets,
      });
      if (saved) {
        options.onSecretsChanged();
      }
    }),
    vscode.commands.registerCommand('asyncapi.deleteSecret', async () => {
      if (!options.canManageSecrets()) {
        return;
      }
      const deleted = await runDeleteSecretCommand(context, {
        resource: activeResource(),
        canManageSecrets: options.canManageSecrets,
      });
      if (deleted) {
        options.onSecretsChanged();
      }
    })
  );
}

/**
 * Called when a remote $ref returns 401/403. Returns true when the user stored
 * a named secret that settings already reference, so the request can be retried.
 */
export async function offerSaveSecretForAuthFailure(
  context: vscode.ExtensionContext,
  info: { url: string; status: number },
  options: { resource?: vscode.Uri }
): Promise<boolean> {
  if (!vscode.workspace.isTrusted) {
    return false;
  }

  const host = hostOfUrl(info.url);
  if (!host) {
    return false;
  }

  const keys = secretKeysForUrl(info.url, getConfig(options.resource));
  if (keys.length === 0) {
    return false;
  }

  const choice = await vscode.window.showWarningMessage(
    `AsyncAPI Preview: HTTP ${info.status} from ${host}. Set the named secret used by this host?`,
    'Set Secret',
    'Not Now'
  );
  if (choice !== 'Set Secret') {
    return false;
  }

  return runSetSecretCommand(context, {
    resource: options.resource,
    preferKeys: keys,
    canManageSecrets: () => vscode.workspace.isTrusted,
  });
}

export function warnPlaintextCredentials(
  context: vscode.ExtensionContext,
  config: ExtensionConfig,
  logger: Logger
): void {
  const fields = plaintextCredentialFields(config);
  if (fields.length === 0 || context.globalState.get(PLAINTEXT_WARNED_STATE)) {
    return;
  }

  const message =
    `AsyncAPI Preview: ${fields.join(', ')} stores a password or token in settings.json, ` +
    `which may be synced or committed. Use "AsyncAPI: Set Secret" so settings only keep a ` +
    `passwordSecret or bearerTokenSecret key name.`;

  logger.info(config.outputVerbosity, message);

  void vscode.window
    .showWarningMessage(message, 'Set Secret', 'Dismiss')
    .then(async choice => {
      if (choice === 'Dismiss' || choice === 'Set Secret') {
        await context.globalState.update(PLAINTEXT_WARNED_STATE, true);
      }
      if (choice === 'Set Secret') {
        await vscode.commands.executeCommand('asyncapi.setSecret');
      }
    });
}

async function runSetSecretCommand(
  context: vscode.ExtensionContext,
  options: { resource?: vscode.Uri; preferKeys?: string[]; canManageSecrets: () => boolean }
): Promise<boolean> {
  const key = await pickSecretKey(context, options.resource, options.preferKeys);
  if (!key) {
    return false;
  }

  const value = await vscode.window.showInputBox({
    title: `Set AsyncAPI secret: ${key}`,
    password: true,
    prompt: 'Stored in the OS keychain. settings.json should reference this name as passwordSecret or bearerTokenSecret.',
    ignoreFocusOut: true,
  });
  if (value === undefined) {
    return false;
  }
  if (!options.canManageSecrets()) {
    return false;
  }

  await context.secrets.store(key, value);
  await rememberKey(context, key);
  await vscode.window.showInformationMessage(
    `Saved secret “${key}”. Point passwordSecret or bearerTokenSecret at this name.`
  );

  return true;
}

async function runDeleteSecretCommand(
  context: vscode.ExtensionContext,
  options: { resource?: vscode.Uri; canManageSecrets: () => boolean }
): Promise<boolean> {
  const key = await pickExistingSecretKey(context, options.resource, 'Delete AsyncAPI secret');
  if (!key) {
    return false;
  }
  if (!options.canManageSecrets()) {
    return false;
  }

  await context.secrets.delete(key);
  await forgetKey(context, key);
  await vscode.window.showInformationMessage(`Deleted secret “${key}”.`);

  return true;
}

async function pickSecretKey(
  context: vscode.ExtensionContext,
  resource: vscode.Uri | undefined,
  preferKeys?: string[]
): Promise<string | undefined> {
  const known = unique([...(preferKeys ?? []), ...knownSecretKeys(context, resource)]);
  if (preferKeys?.length === 1 && known.length === 1) {
    return preferKeys[0];
  }

  if (known.length === 0) {
    return promptNewKey();
  }

  const picked = await vscode.window.showQuickPick(
    [
      ...known.map(name => ({
        label: name,
        description: preferKeys?.includes(name) ? 'used by this host' : referencedHint(resource, name),
        key: name,
      })),
      { label: 'New secret…', key: undefined as string | undefined },
    ],
    {
      title: 'AsyncAPI: Set Secret',
      placeHolder: 'Name used by passwordSecret or bearerTokenSecret',
      ignoreFocusOut: true,
    }
  );
  if (!picked) {
    return undefined;
  }

  return picked.key ?? promptNewKey();
}

async function pickExistingSecretKey(
  context: vscode.ExtensionContext,
  resource: vscode.Uri | undefined,
  title: string
): Promise<string | undefined> {
  const known = knownSecretKeys(context, resource);
  if (known.length === 0) {
    return vscode.window.showInputBox({
      title,
      prompt: 'Secret key to delete',
      ignoreFocusOut: true,
    });
  }

  const picked = await vscode.window.showQuickPick(
    [...known.map(name => ({ label: name, key: name })), { label: 'Enter a key…', key: undefined as string | undefined }],
    {
      title,
      placeHolder: 'Named secret stored in the OS keychain',
      ignoreFocusOut: true,
    }
  );
  if (!picked) {
    return undefined;
  }

  return (
    picked.key ??
    vscode.window.showInputBox({
      title,
      prompt: 'Secret key to delete',
      ignoreFocusOut: true,
    })
  );
}

async function promptNewKey(): Promise<string | undefined> {
  return vscode.window.showInputBox({
    title: 'AsyncAPI secret name',
    prompt: 'Name you will put in passwordSecret or bearerTokenSecret. The same name can be reused for every host.',
    ignoreFocusOut: true,
  });
}

function knownSecretKeys(context: vscode.ExtensionContext, resource: vscode.Uri | undefined): string[] {
  return unique([...context.globalState.get<string[]>(SECRET_KEYS_STATE, []), ...referencedSecretKeys(getConfig(resource))]);
}

function referencedHint(resource: vscode.Uri | undefined, name: string): string | undefined {
  return referencedSecretKeys(getConfig(resource)).includes(name) ? 'referenced in settings' : undefined;
}

async function rememberKey(context: vscode.ExtensionContext, key: string): Promise<void> {
  const keys = context.globalState.get<string[]>(SECRET_KEYS_STATE, []);
  if (!keys.includes(key)) {
    await context.globalState.update(SECRET_KEYS_STATE, [...keys, key]);
  }
}

async function forgetKey(context: vscode.ExtensionContext, key: string): Promise<void> {
  const keys = context.globalState.get<string[]>(SECRET_KEYS_STATE, []);
  await context.globalState.update(
    SECRET_KEYS_STATE,
    keys.filter(existing => existing !== key)
  );
}

function activeResource(): vscode.Uri | undefined {
  return vscode.window.activeTextEditor?.document.uri;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
