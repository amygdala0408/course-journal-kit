// Course packs registry
import type { CoursePack } from '../schemas/types';
import { getCustomCoursePacks } from '../utils/storage';
import { med584 } from './med584';

export const builtInCoursePacks: CoursePack[] = [med584];

export function getCoursePacks(): CoursePack[] {
  return [...builtInCoursePacks, ...getCustomCoursePacks()];
}

export function getCoursePack(courseId: string): CoursePack | undefined {
  return getCoursePacks().find((c) => c.id === courseId);
}
