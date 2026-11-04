/** Portable, framework-free Music-Worlds quiz core. Never ships media or lyrics. */
export type MusicTask = {
  id: string;
  kind: 'audio' | 'text';
  language: string;
  rights: { basis: 'licensed' | 'public-domain' | 'original'; evidence: string };
  prompt: string;
  answer: string;
  alternatives: [string, string, string];
  hint?: string;
  album?: string;
};
export function validateMusicTask(task: MusicTask): void {
  if (!task.id.trim() || !task.language.trim() || !task.prompt.trim() || !task.rights.evidence.trim())
    throw new Error('Task and rights evidence are required.');
  if (!['audio', 'text'].includes(task.kind) || !['licensed', 'public-domain', 'original'].includes(task.rights.basis))
    throw new Error('Unsupported task or rights basis.');
  const answers = [task.answer, ...task.alternatives];
  if (answers.length !== 4 || answers.some(a => !a.trim()) || new Set(answers.map(a => a.normalize('NFKC').trim().toLocaleLowerCase())).size !== 4)
    throw new Error('Four distinct song titles are required.');
}
/** Caller supplies opaque choice IDs and a server-side shuffle; IDs never encode correctness. */
export function musicRound(task: MusicTask, shuffle: <T>(values: T[]) => T[], id: () => string) {
  validateMusicTask(task);
  const choices = shuffle([task.answer, ...task.alternatives].map(text => ({ id: id(), text })));
  return { taskId: task.id, choices, correctId: choices.find(c => c.text === task.answer)!.id };
}
/** Keep this result server-side until every player has answered. */
export function musicPoint(correctId: string, selectedId: string): number {
  return correctId === selectedId ? 1 : 0;
}
export function musicHelp(task: MusicTask, step: 0 | 1 | 2) {
  return { hint: step >= 1 ? task.hint ?? '' : '', album: step >= 2 ? task.album ?? '' : '' };
}
