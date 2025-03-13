import { FC, memo } from 'react'
import './BottomBar.css'
import { Divider, Stack } from '@mui/material'

const BottomBarFC: FC<{
  children: React.ReactNode
}> = ({
  children
}) => {
  return (
    <Stack direction='row' spacing={2} useFlexGap alignItems='center' justifyContent='center' divider={<Divider orientation='vertical' flexItem />}>
      {children}
    </Stack>
  )
}

export const BottomBar = memo(BottomBarFC)
