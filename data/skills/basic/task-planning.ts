export const skill = {
  name: 'task_planning',
  description: 'Breaks a request into actionable steps and expected outputs before execution.',
  usesTools: ['read_file'],
  execute: async (input: Record<string, unknown> = {}) => {
    const task = typeof input.task === 'string' ? input.task : typeof input.prompt === 'string' ? input.prompt : 'General task';
    const steps = [
      'Inspect the relevant files or project scope.',
      'Identify the minimal changes needed for the task.',
      'Apply the change with validation in the narrowest possible scope.',
      'Verify the resulting behavior with the relevant checks.',
    ];

    return {
      ok: true,
      name: 'task_planning',
      task,
      steps,
      summary: `Plan for: ${task}`,
    };
  },
};
