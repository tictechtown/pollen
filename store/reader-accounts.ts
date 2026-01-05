import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type { ReaderAccount } from '@/services/reader-api/types'

type ReaderAccountsState = {
  accounts: ReaderAccount[]
  activeAccountId: string
  setActiveAccountId: (id: string) => void
  upsertAccount: (account: ReaderAccount) => void
  removeAccount: (id: string) => void
}

const LOCAL_ACCOUNT: ReaderAccount = { id: 'local', kind: 'local' }

export const useReaderAccountsStore = create<ReaderAccountsState>()(
  devtools((set) => ({
    accounts: [LOCAL_ACCOUNT],
    activeAccountId: LOCAL_ACCOUNT.id,
    setActiveAccountId: (id) => set({ activeAccountId: id }),
    upsertAccount: (account) =>
      set((state) => {
        const next = state.accounts.filter((a) => a.id !== account.id)
        next.push(account)
        return { accounts: next }
      }),
    removeAccount: (id) =>
      set((state) => {
        const next = state.accounts.filter((a) => a.id !== id)
        const activeAccountId = state.activeAccountId === id ? LOCAL_ACCOUNT.id : state.activeAccountId
        return { accounts: next.length ? next : [LOCAL_ACCOUNT], activeAccountId }
      }),
  })),
)

