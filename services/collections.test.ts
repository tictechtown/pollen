import { describe, expect, it } from 'vitest'

import { dedupeById } from './collections'

describe('dedupeById', () => {
  it('removes later duplicates while keeping order', () => {
    const result = dedupeById([
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
      { id: 'a', value: 3 },
      { id: 'c', value: 4 },
      { id: 'b', value: 5 },
    ])
    expect(result).toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
      { id: 'c', value: 4 },
    ])
  })
})
