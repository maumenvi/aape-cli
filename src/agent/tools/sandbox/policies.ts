export interface SandboxPolicy {
  filesystem?: {
    enabled: boolean;
    allowedPaths?: string[];
    allowedPatterns?: string[];
    blockPatterns?: string[];
    readOnly?: boolean;
  };
  network?: {
    enabled: boolean;
    allowedHosts?: string[];
    blockHosts?: string[];
    allowedProtocols?: ('http' | 'https' | 'ftp')[];
  };
  commands?: {
    enabled: boolean;
    allowedCommands?: string[];
    blockPatterns?: string[];
    timeout?: number;
  };
  requiresApproval?: boolean;
}

export interface SandboxContext {
  policy: SandboxPolicy;
  llmId?: string;
  metadata?: Record<string, unknown>;
}

const DEFAULT_POLICY: SandboxPolicy = {
  filesystem: {
    enabled: false,
    readOnly: true,
  },
  network: {
    enabled: false,
  },
  commands: {
    enabled: false,
  },
  requiresApproval: true,
};

export function createDefaultPolicy(): SandboxPolicy {
  return { ...DEFAULT_POLICY };
}

export function validatePathAccess(policy: SandboxPolicy, filePath: string): boolean {
  if (!policy.filesystem?.enabled) return false;

  const { allowedPaths = [], blockPatterns = [], allowedPatterns = [] } = policy.filesystem;

  if (blockPatterns.some((pattern) => new RegExp(pattern).test(filePath))) {
    return false;
  }

  if (allowedPatterns.length > 0) {
    return allowedPatterns.some((pattern) => new RegExp(pattern).test(filePath));
  }

  if (allowedPaths.length > 0) {
    return allowedPaths.some((allowed) => filePath.startsWith(allowed));
  }

  return false;
}

export function validateNetworkAccess(policy: SandboxPolicy, url: string): boolean {
  if (!policy.network?.enabled) return false;

  try {
    const urlObj = new URL(url);
    const { allowedHosts = [], blockHosts = [], allowedProtocols = ['https'] } = policy.network;

    if (!allowedProtocols.includes(urlObj.protocol as 'http' | 'https' | 'ftp')) {
      return false;
    }

    if (blockHosts.some((host) => urlObj.hostname.includes(host))) {
      return false;
    }

    if (allowedHosts.length > 0) {
      return allowedHosts.some((host) => urlObj.hostname === host || urlObj.hostname.endsWith(`.${host}`));
    }

    return true;
  } catch {
    return false;
  }
}

export function validateCommandAccess(policy: SandboxPolicy, command: string): boolean {
  if (!policy.commands?.enabled) return false;

  const { allowedCommands = [], blockPatterns = [] } = policy.commands;

  if (blockPatterns.some((pattern) => new RegExp(pattern).test(command))) {
    return false;
  }

  if (allowedCommands.length > 0) {
    return allowedCommands.some((allowed) => command.startsWith(allowed));
  }

  return false;
}
