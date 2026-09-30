import * as vscode from 'vscode';
import { createLaunchChoiceKey, escapeStatusBarText, isDuplicateLaunchChoice } from './runSelectorUtils';

const STORAGE_KEY = 'aoh.runSelector.selectedConfiguration';
const LEGACY_STORAGE_KEY = 'aoh.runSelector.selectedConfiguration';
const runTerminalsByKey = new Map<string, vscode.Terminal>();

interface LaunchChoice {
  name: string;
  folder?: vscode.WorkspaceFolder;
  configuration: vscode.DebugConfiguration;
  key: string;
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const sessions = new Map<string, vscode.DebugSession>();
  const restarting = new Set<string>();
  if (vscode.debug.activeDebugSession) {
    sessions.set(vscode.debug.activeDebugSession.id, vscode.debug.activeDebugSession);
  }

  function selectedSessions(selected: LaunchChoice): vscode.DebugSession[] {
    return [...sessions.values()].filter(session =>
      !session.parentSession &&
      session.configuration.name === selected.name &&
      session.workspaceFolder?.uri.toString() === selected.folder?.uri.toString()
    );
  }

  // Separate status-bar items make this behave like a tiny toolbar while still
  // allowing the selected launch configuration label to change dynamically.
  const buildItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 105);
  buildItem.name = 'AOH - Run Selector: Build';
  buildItem.text = '$(aoh-build)';
  buildItem.command = 'aoh.runSelector.build';
  buildItem.tooltip = 'Build selected launch configuration';

  const runItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 104);
  runItem.name = 'AOH - Run Selector: Run';
  runItem.text = '$(play)';
  runItem.command = 'aoh.runSelector.run';
  runItem.tooltip = 'Run selected launch configuration without debugging';

  const debugItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 103);
  debugItem.name = 'AOH - Run Selector: Debug';
  debugItem.text = '$(debug-alt)';
  debugItem.command = 'aoh.runSelector.debug';
  debugItem.tooltip = 'Debug selected launch configuration';

  const selectorItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 102);
  selectorItem.name = 'AOH - Run Selector: Launch Configuration';
  selectorItem.command = 'aoh.runSelector.select';
  selectorItem.tooltip = 'Select launch configuration';

  const stopItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 106);
  stopItem.name = 'AOH - Run Selector: Stop';
  stopItem.text = '$(debug-stop)';
  stopItem.command = 'aoh.runSelector.stop';
  stopItem.tooltip = 'Stop running launch configuration';

  context.subscriptions.push(buildItem, runItem, debugItem, selectorItem, stopItem);

  async function refreshUi(): Promise<void> {
    const selected = await getSelectedChoice(context);
    const isRunning = selected !== undefined && (
      selectedSessions(selected).length > 0 || runTerminalsByKey.has(selected.key)
    );

    selectorItem.text = selected
      ? `${escapeStatusBarText(selected.name)} $(chevron-down)`
      : `Select launch $(chevron-down)`;

    selectorItem.show();
    buildItem.show();

    runItem.text = isRunning ? '$(debug-restart)' : '$(play)';
    runItem.command = isRunning ? 'aoh.runSelector.restart' : 'aoh.runSelector.run';
    runItem.name = `AOH - Run Selector: ${isRunning ? 'Restart' : 'Run'}`;
    runItem.tooltip = isRunning
      ? 'Restart selected launch configuration without debugging'
      : 'Run selected launch configuration without debugging';
    debugItem.text = isRunning ? '$(debug-restart) $(debug-alt)' : '$(debug-alt)';
    debugItem.command = isRunning ? 'aoh.runSelector.restartDebug' : 'aoh.runSelector.debug';
    debugItem.name = `AOH - Run Selector: ${isRunning ? 'Restart in Debug Mode' : 'Debug'}`;
    debugItem.tooltip = isRunning
      ? 'Restart selected launch configuration in debug mode'
      : 'Debug selected launch configuration';

    if (selected && !restarting.has(selected.key)) {
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

  async function restartSelected(debug: boolean): Promise<void> {
    const selected = await getSelectedChoice(context);
    if (!selected || restarting.has(selected.key)) {
      return;
    }
    const runningSessions = selectedSessions(selected);
    const runningTerminal = runTerminalsByKey.get(selected.key);
    if (runningSessions.length === 0 && !runningTerminal) {
      return;
    }

    restarting.add(selected.key);
    await refreshUi();
    try {
      await stopChoice(selected, runningSessions, runningTerminal);
      if (debug) {
        await startDebugChoice(selected);
      } else {
        await startRunChoice(selected);
      }
    } catch (error) {
      void vscode.window.showErrorMessage(`Could not restart '${selected.name}': ${String(error)}`);
    } finally {
      restarting.delete(selected.key);
      await refreshUi();
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('aoh.runSelector.build', async () => {
      await buildSelected(context);
    }),

    vscode.commands.registerCommand('aoh.runSelector.select', async () => {
      const choices = getLaunchChoices();

      if (choices.length === 0) {
        const action = await vscode.window.showWarningMessage(
          'No launch configurations found.',
          'Open launch.json'
        );

        if (action === 'Open launch.json') {
          await vscode.commands.executeCommand('workbench.action.debug.configure');
        }
        return;
      }

      const selectedKey = context.workspaceState.get<string>(STORAGE_KEY) ?? context.workspaceState.get<string>(LEGACY_STORAGE_KEY);
      const items = choices.map(choice => ({
        label: choice.name,
        description: choice.folder?.name ?? 'Workspace',
        detail: choice.configuration.type
          ? `Debugger: ${choice.configuration.type}`
          : undefined,
        picked: choice.key === selectedKey,
        choice
      }));

      const item = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select launch configuration',
        matchOnDescription: true,
        matchOnDetail: true
      });

      if (!item) {
        return;
      }

      await context.workspaceState.update(STORAGE_KEY, item.choice.key);
      await refreshUi();
    }),

    vscode.commands.registerCommand('aoh.runSelector.run', async () => {
      await startSelected(context, false);
      await refreshUi();
    }),

    vscode.commands.registerCommand('aoh.runSelector.debug', async () => {
      await startSelected(context, true);
    }),

    vscode.commands.registerCommand('aoh.runSelector.stop', async () => {
      const selected = await getSelectedChoice(context);
      if (selected) {
        await stopChoice(selected, selectedSessions(selected), runTerminalsByKey.get(selected.key));
        await refreshUi();
      }
    }),

    vscode.commands.registerCommand('aoh.runSelector.restart', () => restartSelected(false)),
    vscode.commands.registerCommand('aoh.runSelector.restartDebug', () => restartSelected(true)),

    vscode.debug.onDidStartDebugSession(session => {
      sessions.set(session.id, session);
      void refreshUi();
    }),
    vscode.debug.onDidTerminateDebugSession(session => {
      sessions.delete(session.id);
      void refreshUi();
    }),
    vscode.debug.onDidChangeActiveDebugSession(refreshUi),
    vscode.window.onDidCloseTerminal(terminal => {
      for (const [key, runningTerminal] of runTerminalsByKey) {
        if (runningTerminal === terminal) {
          runTerminalsByKey.delete(key);
          void refreshUi();
          break;
        }
      }
    }),

    vscode.workspace.onDidChangeConfiguration(async event => {
      if (event.affectsConfiguration('launch')) {
        await ensureValidSelection(context);
        await refreshUi();
      }
    }),

    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      await ensureValidSelection(context);
      await refreshUi();
    })
  );

  await ensureValidSelection(context);
  await refreshUi();
}

function getLaunchChoices(): LaunchChoice[] {
  const choices: LaunchChoice[] = [];
  const folders = vscode.workspace.workspaceFolders ?? [];

  for (const folder of folders) {
    const launch = vscode.workspace.getConfiguration('launch', folder.uri);
    const configurations = launch.get<vscode.DebugConfiguration[]>('configurations', []);

    for (const configuration of configurations) {
      if (!configuration?.name) {
        continue;
      }

      choices.push({
        name: configuration.name,
        folder,
        configuration,
        key: createLaunchChoiceKey(folder.uri.toString(), configuration.name)
      });
    }
  }

  // A multi-root .code-workspace file can also contain launch configurations.
  if (folders.length > 1 || vscode.workspace.workspaceFile) {
    const launch = vscode.workspace.getConfiguration('launch');
    const configurations = launch.get<vscode.DebugConfiguration[]>('configurations', []);

    for (const configuration of configurations) {
      if (!configuration?.name) {
        continue;
      }

      if (
        isDuplicateLaunchChoice(
          choices.map(choice => ({ name: choice.name, type: choice.configuration.type })),
          configuration
        )
      ) {
        continue;
      }

      choices.push({
        name: configuration.name,
        configuration,
        key: createLaunchChoiceKey('workspace', configuration.name)
      });
    }
  }

  return choices;
}

async function getSelectedChoice(
  context: vscode.ExtensionContext
): Promise<LaunchChoice | undefined> {
  const choices = getLaunchChoices();
  const selectedKey = context.workspaceState.get<string>(STORAGE_KEY) ?? context.workspaceState.get<string>(LEGACY_STORAGE_KEY);
  return choices.find(choice => choice.key === selectedKey) ?? choices[0];
}

async function ensureValidSelection(context: vscode.ExtensionContext): Promise<void> {
  const choices = getLaunchChoices();

  if (choices.length === 0) {
    await context.workspaceState.update(STORAGE_KEY, undefined);
    return;
  }

  const selectedKey = context.workspaceState.get<string>(STORAGE_KEY) ?? context.workspaceState.get<string>(LEGACY_STORAGE_KEY);
  if (!selectedKey || !choices.some(choice => choice.key === selectedKey)) {
    await context.workspaceState.update(STORAGE_KEY, choices[0].key);
  }
}

async function buildSelected(context: vscode.ExtensionContext): Promise<void> {
  const selected = await getSelectedChoice(context);

  if (!selected) {
    await vscode.commands.executeCommand('aoh.runSelector.select');
    return;
  }

  const preLaunchTask = selected.configuration.preLaunchTask;
  if (typeof preLaunchTask !== 'string' || preLaunchTask.trim().length === 0) {
    void vscode.window.showWarningMessage(
      `No preLaunchTask configured for '${selected.name}'.`
    );
    return;
  }

  const tasks = await vscode.tasks.fetchTasks();
  const matchingTasks = tasks.filter(task => task.name === preLaunchTask);

  if (matchingTasks.length === 0) {
    void vscode.window.showErrorMessage(
      `Build task '${preLaunchTask}' for '${selected.name}' was not found.`
    );
    return;
  }

  const task =
    matchingTasks.find(candidate =>
      isTaskInWorkspaceFolder(candidate, selected.folder)
    ) ?? matchingTasks[0];

  await vscode.tasks.executeTask(task);
}

function isTaskInWorkspaceFolder(
  task: vscode.Task,
  folder: vscode.WorkspaceFolder | undefined
): boolean {
  if (!folder) {
    return task.scope === vscode.TaskScope.Workspace;
  }

  return (
    typeof task.scope === 'object' &&
    task.scope.uri.toString() === folder.uri.toString()
  );
}

async function startSelected(
  context: vscode.ExtensionContext,
  debug: boolean
): Promise<void> {
  const selected = await getSelectedChoice(context);

  if (!selected) {
    await vscode.commands.executeCommand('aoh.runSelector.select');
    return;
  }

  if (debug) {
    await startDebugChoice(selected);
  } else {
    await startRunChoice(selected);
  }
}

async function executePreLaunchTask(selected: LaunchChoice): Promise<boolean> {
  const preLaunchTask = selected.configuration.preLaunchTask;
  if (typeof preLaunchTask !== 'string' || preLaunchTask.trim().length === 0) {
    return true;
  }

  const tasks = await vscode.tasks.fetchTasks();
  const matchingTasks = tasks.filter(task => task.name === preLaunchTask);
  if (matchingTasks.length === 0) {
    void vscode.window.showErrorMessage(
      `Pre-launch task '${preLaunchTask}' for '${selected.name}' was not found.`
    );
    return false;
  }

  const task = matchingTasks.find(candidate => isTaskInWorkspaceFolder(candidate, selected.folder)) ?? matchingTasks[0];
  const execution = await vscode.tasks.executeTask(task);

  return await new Promise<boolean>(resolve => {
    const processListener = vscode.tasks.onDidEndTaskProcess(event => {
      if (event.execution !== execution) {
        return;
      }
      cleanup();
      if (event.exitCode === 0 || event.exitCode === undefined) {
        resolve(true);
      } else {
        void vscode.window.showErrorMessage(
          `Pre-launch task '${preLaunchTask}' failed with exit code ${event.exitCode}.`
        );
        resolve(false);
      }
    });
    const taskListener = vscode.tasks.onDidEndTask(event => {
      if (event.execution !== execution) {
        return;
      }
      // Tasks without a process event (for example custom task providers) still need to unblock Run.
      setTimeout(() => {
        cleanup();
        resolve(true);
      }, 0);
    });
    function cleanup(): void {
      processListener.dispose();
      taskListener.dispose();
    }
  });
}

function resolveLaunchValue(value: string, selected: LaunchChoice): string {
  const workspaceFolder = selected.folder?.uri.fsPath ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
  return value
    .replace(/\$\{workspaceFolder\}/g, workspaceFolder)
    .replace(/\$\{workspaceFolderBasename\}/g, selected.folder?.name ?? '');
}

function runTerminalOptions(selected: LaunchChoice): vscode.TerminalOptions | undefined {
  const configuration = selected.configuration;
  if (configuration.request !== 'launch') {
    void vscode.window.showErrorMessage(`'${selected.name}' is not a launch configuration.`);
    return undefined;
  }

  const args = Array.isArray(configuration.args)
    ? configuration.args.map((arg: unknown) => resolveLaunchValue(String(arg), selected))
    : [];
  const projectPath = typeof configuration.projectPath === 'string'
    ? resolveLaunchValue(configuration.projectPath, selected)
    : undefined;
  const program = typeof configuration.program === 'string'
    ? resolveLaunchValue(configuration.program, selected)
    : undefined;

  if (!program && !projectPath) {
    void vscode.window.showErrorMessage(
      `Run without debugging requires either 'program' or 'projectPath' in launch configuration '${selected.name}'.`
    );
    return undefined;
  }
  const cwd = typeof configuration.cwd === 'string'
    ? resolveLaunchValue(configuration.cwd, selected)
    : selected.folder?.uri.fsPath;
  const env = configuration.env && typeof configuration.env === 'object'
    ? Object.fromEntries(Object.entries(configuration.env).map(([key, value]) => [
        key,
        value === null || value === undefined ? null : resolveLaunchValue(String(value), selected)
      ]))
    : undefined;

  if (projectPath) {
    return {
      name: selected.name,
      cwd,
      env,
      shellPath: 'dotnet',
      shellArgs: ['run', '--project', projectPath, '--', ...args],
      iconPath: new vscode.ThemeIcon('play')
    };
  }

  const executable = program!;
  const isDll = executable.toLowerCase().endsWith('.dll');
  return {
    name: selected.name,
    cwd,
    env,
    shellPath: isDll ? 'dotnet' : executable,
    shellArgs: isDll ? [executable, ...args] : args,
    iconPath: new vscode.ThemeIcon('play')
  };
}

async function startRunChoice(selected: LaunchChoice): Promise<void> {
  const options = runTerminalOptions(selected);
  if (!options) {
    return;
  }

  if (!await executePreLaunchTask(selected)) {
    return;
  }

  const terminal = vscode.window.createTerminal(options);
  runTerminalsByKey.set(selected.key, terminal);
  terminal.show(true);
}

async function startDebugChoice(selected: LaunchChoice): Promise<void> {
  const started = await vscode.debug.startDebugging(selected.folder, selected.configuration);
  if (!started) {
    void vscode.window.showErrorMessage(`Could not debug '${selected.name}'.`);
  }
}

async function stopSession(session: vscode.DebugSession): Promise<void> {
  return new Promise((resolve, reject) => {
    const listener = vscode.debug.onDidTerminateDebugSession(terminated => {
      if (terminated.id === session.id) {
        cleanup();
        resolve();
      }
    });
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for the debug session to stop.'));
    }, 30000);
    function cleanup(): void {
      clearTimeout(timeout);
      listener.dispose();
    }
    Promise.resolve(vscode.debug.stopDebugging(session)).catch(error => {
      cleanup();
      reject(error);
    });
  });
}

async function stopChoice(
  selected: LaunchChoice,
  sessions: vscode.DebugSession[],
  terminal: vscode.Terminal | undefined
): Promise<void> {
  if (terminal) {
    terminal.dispose();
    runTerminalsByKey.delete(selected.key);
  }
  await Promise.all(sessions.map(stopSession));
}

export function deactivate(): void {}
