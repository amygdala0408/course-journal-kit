// Course packs registry
import type { CoursePack } from '../schemas/types';
import { med584 } from './med584';

export const coursePacks: CoursePack[] = [med584];

export function getCoursePack(courseId: string): CoursePack | undefined {
  return coursePacks.find((c) => c.id === courseId);
}
