export interface LaunchConfigurationLike {
  name?: string;
  type?: string;
}

export interface LaunchChoiceIdentity {
  name: string;
  type?: string;
}

export function createLaunchChoiceKey(scope: string, name: string): string {
  return `${scope}::${name}`;
}

export function isDuplicateLaunchChoice(
  existing: readonly LaunchChoiceIdentity[],
  candidate: LaunchConfigurationLike
): boolean {
  if (!candidate.name) {
    return false;
  }

  return existing.some(
    choice => choice.name === candidate.name && choice.type === candidate.type
  );
}

export function escapeStatusBarText(value: string): string {
  return value.replace(/\$\(/g, '\\$(');
}
