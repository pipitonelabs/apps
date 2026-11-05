/** Shared 3-row tile layout (label / value / footer) so every tile lines up in the grid. */
export const TILE = 'flex min-h-32 flex-col justify-between gap-4 bg-card p-4 sm:p-5'
export const TILE_HEAD = 'flex h-4 items-center justify-between'
/** leading-tight keeps descenders inside the truncate (overflow hidden) box. */
export const TILE_VALUE = 'truncate text-2xl leading-tight font-light tracking-tight sm:text-3xl'
export const TILE_FOOT = 'flex h-4 items-end gap-2 text-xs leading-4 text-muted-foreground'
