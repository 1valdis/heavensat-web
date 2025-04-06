import { FC, memo, ReactNode, RefObject } from 'react'
import { Divider, Stack } from '@mui/material'

const TopMenuFC: FC<{ children: ReactNode | ReactNode[], ref: RefObject<HTMLDivElement | null> }> = ({ children, ref }) => {
  return (
    <div style={{ display: 'grid', placeItems: 'center' }} ref={ref}>
      <Stack direction='row' divider={<Divider orientation='vertical' flexItem />}>{children}</Stack>
    </div>
  )
}

export const TopMenu = memo(TopMenuFC)
