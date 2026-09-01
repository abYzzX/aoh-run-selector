import * as vscode from "vscode";

const STORAGE_KEY = "aoh.runSelector.selectedConfiguration";
const LEGACY_STORAGE_KEY = "aoh.runSelector.selectedConfiguration";

interface LaunchChoice {
  name: string;
  folder?: vscode.WorkspaceFolder;
  configuration: vscode.DebugConfiguration;
  key: string;
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Separate status-bar items make this behave like a tiny toolbar while still
  // allowing the selected launch configuration label to change dynamically.
  const buildItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 105);
  buildItem.name = "AOH - Run Selector: Build";
  buildItem.text = "$(tools)";
  buildItem.text = "$(aoh-build)";
  buildItem.command = "aoh.runSelector.build";
  buildItem.tooltip = "Build workspace";

  const runItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 104);
  runItem.name = "AOH - Run Selector: Run";
  runItem.text = "$(play)";
  runItem.command = "aoh.runSelector.run";
  runItem.tooltip = "Run selected launch configuration without debugging";

  const debugItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 103);
  debugItem.name = "AOH - Run Selector: Debug";
  debugItem.text = "$(debug-alt)";
  debugItem.command = "aoh.runSelector.debug";
  debugItem.tooltip = "Debug selected launch configuration";

  const selectorItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 102);
  selectorItem.name = "AOH - Run Selector: Launch Configuration";
  selectorItem.command = "aoh.runSelector.select";
  selectorItem.tooltip = "Select launch configuration";

  const stopItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 106);
  stopItem.name = "AOH - Run Selector: Stop";
  stopItem.text = "$(debug-stop)";
  stopItem.command = "aoh.runSelector.stop";
  stopItem.tooltip = "Stop running launch configuration";

  context.subscriptions.push(buildItem, runItem, debugItem, selectorItem, stopItem);

  async function refreshUi(): Promise<void> {
    const selected = await getSelectedChoice(context);
    const isRunning = vscode.debug.activeDebugSession !== undefined;

    selectorItem.text = selected
      ? `${escapeStatusBarText(selected.name)} $(chevron-down)`
      : `Select launch $(chevron-down)`;

    selectorItem.show();
    buildItem.show();

    if (selected && !isRunning) {
      runItem.show();
      debugItem.show();
    } else {
      runItem.hide();
      debugItem.hide();
    }

    if (isRunning) {
      stopItem.show();
    } else {
      stopItem.hide();
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("aoh.runSelector.build", async () => {
      await vscode.commands.executeCommand("workbench.action.tasks.build");
    }),

    vscode.commands.registerCommand("aoh.runSelector.select", async () => {
      const choices = getLaunchChoices();

      if (choices.length === 0) {
        const action = await vscode.window.showWarningMessage("No launch configurations found.", "Open launch.json");

        if (action === "Open launch.json") {
          await vscode.commands.executeCommand("workbench.action.debug.configure");
        }
        return;
      }

      const selectedKey =
        context.workspaceState.get<string>(STORAGE_KEY) ?? context.workspaceState.get<string>(LEGACY_STORAGE_KEY);
      const items = choices.map((choice) => ({
        label: choice.name,
        description: choice.folder?.name ?? "Workspace",
        detail: choice.configuration.type ? `Debugger: ${choice.configuration.type}` : undefined,
        picked: choice.key === selectedKey,
        choice,
      }));

      const item = await vscode.window.showQuickPick(items, {
        placeHolder: "Select launch configuration",
        matchOnDescription: true,
        matchOnDetail: true,
      });

      if (!item) {
        return;
      }

      await context.workspaceState.update(STORAGE_KEY, item.choice.key);
      await refreshUi();
    }),

    vscode.commands.registerCommand("aoh.runSelector.run", async () => {
      await startSelected(context, true);
    }),

    vscode.commands.registerCommand("aoh.runSelector.debug", async () => {
      await startSelected(context, false);
    }),

    vscode.commands.registerCommand("aoh.runSelector.stop", async () => {
      const activeSession = vscode.debug.activeDebugSession;
      if (activeSession) {
        await vscode.debug.stopDebugging(activeSession);
      }
    }),

    vscode.debug.onDidStartDebugSession(refreshUi),
    vscode.debug.onDidTerminateDebugSession(refreshUi),
    vscode.debug.onDidChangeActiveDebugSession(refreshUi),

    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration("launch")) {
        await ensureValidSelection(context);
        await refreshUi();
      }
    }),

    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      await ensureValidSelection(context);
      await refreshUi();
    }),
  );

  await ensureValidSelection(context);
  await refreshUi();
}

function getLaunchChoices(): LaunchChoice[] {
  const choices: LaunchChoice[] = [];
  const folders = vscode.workspace.workspaceFolders ?? [];

  for (const folder of folders) {
    const launch = vscode.workspace.getConfiguration("launch", folder.uri);
    const configurations = launch.get<vscode.DebugConfiguration[]>("configurations", []);

    for (const configuration of configurations) {
      if (!configuration?.name) {
        continue;
      }

      choices.push({
        name: configuration.name,
        folder,
        configuration,
        key: `${folder.uri.toString()}::${configuration.name}`,
      });
    }
  }

  // A multi-root .code-workspace file can also contain launch configurations.
  if (folders.length > 1 || vscode.workspace.workspaceFile) {
    const launch = vscode.workspace.getConfiguration("launch");
    const configurations = launch.get<vscode.DebugConfiguration[]>("configurations", []);

    for (const configuration of configurations) {
      if (!configuration?.name) {
        continue;
      }

      if (
        choices.some((choice) => choice.name === configuration.name && choice.configuration.type === configuration.type)
      ) {
        continue;
      }

      choices.push({
        name: configuration.name,
        configuration,
        key: `workspace::${configuration.name}`,
      });
    }
  }

  return choices;
}

async function getSelectedChoice(context: vscode.ExtensionContext): Promise<LaunchChoice | undefined> {
  const choices = getLaunchChoices();
  const selectedKey =
    context.workspaceState.get<string>(STORAGE_KEY) ?? context.workspaceState.get<string>(LEGACY_STORAGE_KEY);
  return choices.find((choice) => choice.key === selectedKey) ?? choices[0];
}

async function ensureValidSelection(context: vscode.ExtensionContext): Promise<void> {
  const choices = getLaunchChoices();

  if (choices.length === 0) {
    await context.workspaceState.update(STORAGE_KEY, undefined);
    return;
  }

  const selectedKey =
    context.workspaceState.get<string>(STORAGE_KEY) ?? context.workspaceState.get<string>(LEGACY_STORAGE_KEY);
  if (!selectedKey || !choices.some((choice) => choice.key === selectedKey)) {
    await context.workspaceState.update(STORAGE_KEY, choices[0].key);
  }
}

async function startSelected(context: vscode.ExtensionContext, noDebug: boolean): Promise<void> {
  const selected = await getSelectedChoice(context);

  if (!selected) {
    await vscode.commands.executeCommand("aoh.runSelector.select");
    return;
  }

  const started = await vscode.debug.startDebugging(selected.folder, selected.configuration, { noDebug });

  if (!started) {
    void vscode.window.showErrorMessage(`Could not start '${selected.name}'.`);
  }
}

function escapeStatusBarText(value: string): string {
  // '$(' begins a codicon expression in status bar text.
  return value.replace(/\$\(/g, "\\$(");
}

export function deactivate(): void {}
