import { FC, memo, ReactNode } from 'react'
import { Divider, Stack } from '@mui/material'

const TopMenuFC: FC<{ children: ReactNode | ReactNode[] }> = ({ children }) => {
  return (
    <div style={{ display: 'grid', placeItems: 'center' }}>
      <Stack direction='row' divider={<Divider orientation='vertical' flexItem />}>{children}</Stack>
    </div>
  )
}

export const TopMenu = memo(TopMenuFC)
