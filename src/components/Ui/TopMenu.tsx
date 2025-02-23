import { FC, MouseEvent, useCallback, useState } from 'react'
import { MenuProps } from './Menu.js'
import { Button, Divider, Menu, MenuItem, Stack } from '@mui/material'

export const TopMenu: FC<{}> = () => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const open = !!anchor

  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setAnchor(anchor => anchor ? null : event.currentTarget)
  }, [])
  const handleClose = useCallback(() => {
    setAnchor(null)
  }, [])

  return <div style={{ display: 'grid', placeItems: 'center' }}>
    <Stack direction={'row'} divider={<Divider orientation='vertical' flexItem/>}>
    <Button variant='text'>Options</Button>
    <Button variant='text'>Satellites</Button>
    <Button variant='text'>Backers</Button>
    </Stack>
  </div>
}
