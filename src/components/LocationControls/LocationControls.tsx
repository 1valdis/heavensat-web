import { FC, memo, useCallback, useEffect, useState } from 'react'
import { Location } from '../common-types.js'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItemButton, ListItemText, Menu, MenuItem, Select, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { AddLocationAltOutlined, DeleteForeverOutlined, MyLocation } from '@mui/icons-material'
import { DeviceLocation, useLocations, ZeroLocation } from './use-locations.js'
import { DateTime } from 'luxon'

export const DeviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

const timeZones = Intl.supportedValuesOf('timeZone').map(tz => ({
  text: DateTime.local().setZone(tz).toFormat('ZZ z ZZZZ'),
  zone: tz
})).sort((a, b) => a.text > b.text ? 1 : -1)
const foundCurrentZoneInTheList = timeZones.find(tz => tz.zone === DeviceTimeZone)
if (!foundCurrentZoneInTheList) {
  throw new Error('Current time zone not found in the list of supported time zones')
}

const timeZonesWithSpecial = [
  { text: `Device time zone: ${DateTime.local().setZone(DeviceTimeZone).toFormat('ZZ z ZZZZ')}`, zone: DeviceTimeZone },
  { text: 'UTC', zone: 'UTC' },
  ...timeZones.filter(tz => tz !== foundCurrentZoneInTheList),
]

const LocationControlsFC: FC<{ setLocation: (location: Location) => void, location: Location }> = ({ setLocation, location }) => {
  const [{ locations, selected }, dispatch] = useLocations()

  const updateDeviceLocation = useCallback(() => {
    // eslint-disable-next-line sonarjs/no-intrusive-permissions
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude ?? 0,
        timezone: DeviceTimeZone
      })
    )
  }, [setLocation])

  useEffect(() => {
    if (selected === DeviceLocation) {
      updateDeviceLocation()
    }
    if (selected === ZeroLocation) {
      setLocation({ latitude: 0, longitude: 0, altitude: 0, timezone: DeviceTimeZone })
    }
    if (typeof selected === 'string') {
      const location = locations.find(l => l.id === selected)
      if (location) {
        setLocation(location)
      }
    }
  }, [locations, selected, setLocation, updateDeviceLocation])

  useEffect(() => {
    localStorage.setItem('locationsState', JSON.stringify({ locations, selected: typeof selected === 'string' ? selected : null }))
  }, [locations, selected])

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = !!anchorEl

  const handleClickListItem = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleMenuItemClick = (
    index: string
  ) => {
    dispatch({ type: 'SET_CUSTOM', id: index })
    setAnchorEl(null)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

  const [newLocationDialogOpen, setNewLocationDialogOpen] = useState(false)

  const textOnButtonWithNonZeroLocation = selected === DeviceLocation
    ? 'Device location'
    : locations.find(l => l.id === selected)?.name

  return (
    <Stack direction='row' useFlexGap spacing={1} justifyItems='center' alignItems='center' height='100%'>
      <Tooltip title="Your location data never leaves your device and isn't sent anywhere. It is used solely to calculate the sky and satellite data for you." arrow enterDelay={300}>
        <IconButton color={selected === DeviceLocation ? 'primary' : 'default'} size='large' onClick={() => dispatch({ type: 'SET_DEVICE' })}><MyLocation /></IconButton>
      </Tooltip>
      <List dense>
        <ListItemButton onClick={handleClickListItem}>
          {selected === ZeroLocation
            ? <Alert variant='outlined' severity='warning'>No location selected</Alert>
            : <ListItemText
                primary={textOnButtonWithNonZeroLocation}
                secondary={<>{location.latitude}, {location.longitude} ({location.altitude} m)<br />{location.timezone}</>}
              />}
        </ListItemButton>
      </List>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        {locations.map((location) =>
          <MenuItem
            key={location.id}
            disableRipple
            selected={location.id === selected}
            onClick={() => handleMenuItemClick(location.id)}
          >
            <Stack direction='row' justifyContent='space-between' alignItems='center' width='100%'>
              <Stack direction='column' alignItems='start' gap={1}>
                <Typography variant='body1'>{location.name}</Typography>
                <Typography variant='caption'>{location.latitude}, {location.longitude} ({location.altitude} m)</Typography>
                <Typography variant='caption'>{location.timezone}</Typography>
              </Stack>
              <IconButton onClick={(event) => { dispatch({ type: 'DELETE', id: location.id }); event.stopPropagation() }}><DeleteForeverOutlined /></IconButton>
            </Stack>
          </MenuItem>
        )}
        <MenuItem onClick={() => { setNewLocationDialogOpen(true); handleClose() }}>
          <Stack direction='row' alignItems='start' gap={1}>
            <AddLocationAltOutlined fontSize='small' />
            Add location...
          </Stack>
        </MenuItem>
      </Menu>
      <Dialog
        open={newLocationDialogOpen}
        onClose={handleClose}
        slotProps={{
          paper: {
            component: 'form',
            onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const formData = new FormData(event.currentTarget)
              const formJson = Object.fromEntries(formData.entries()) as { name: string, latitude: string, longitude: string, altitude: string, timezone: string }
              setNewLocationDialogOpen(false)
              dispatch({ type: 'ADD', location: { name: formJson.name, latitude: +formJson.latitude, longitude: +formJson.longitude, altitude: +formJson.altitude, timezone: formJson.timezone } })
            },
          },
        }}
      >
        <DialogTitle>Add location</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            required
            margin='dense'
            name='name'
            label='Location name'
            fullWidth
            variant='standard'
          />
          <TextField
            required
            margin='dense'
            name='latitude'
            label='Latitude'
            type='number'
            slotProps={{
              htmlInput: {
                max: 90,
                min: 0,
                step: 'any'
              }
            }}
            fullWidth
            variant='standard'
            defaultValue={selected === DeviceLocation ? location.latitude : ''}
          />
          <TextField
            required
            margin='dense'
            name='longitude'
            label='Longitude'
            type='number'
            slotProps={{
              htmlInput: {
                max: 180,
                min: 0,
                step: 'any'
              }
            }}
            fullWidth
            variant='standard'
            defaultValue={selected === DeviceLocation ? location.longitude : ''}
          />
          <TextField
            required
            margin='dense'
            name='altitude'
            label='Altitude (meters)'
            type='number'
            slotProps={{
              htmlInput: {
                min: 0
              }
            }}
            fullWidth
            variant='standard'
            defaultValue={selected === DeviceLocation ? location.altitude : ''}
          />
          <Select style={{ marginTop: '2ch' }} size='medium' required name='timezone' defaultValue={DeviceTimeZone} variant='standard' fullWidth>
            {timeZonesWithSpecial.map(tz => <MenuItem key={tz.zone} value={tz.zone}>{tz.text}</MenuItem>)}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewLocationDialogOpen(false)}>Cancel</Button>
          <Button variant='contained' type='submit'>Add and select</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export const LocationControls = memo(LocationControlsFC)
