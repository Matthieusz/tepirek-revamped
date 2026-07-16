/** A single field comparison represented by the filter controls. */
export interface Filter<T = unknown> {
  readonly id: string;
  readonly field: string;
  readonly operator: string;
  readonly values: T[];
}
