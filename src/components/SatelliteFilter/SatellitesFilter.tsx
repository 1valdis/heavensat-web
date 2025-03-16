import { FilterAlt, FilterAltOffOutlined } from '@mui/icons-material'
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid2, TextField } from '@mui/material'
import { FC, Fragment, memo, useState } from 'react'

type MinMaxEnabled = {
  min: number,
  max: number,
  enabled: boolean
}

const keys = ['inclination_deg', 'eccentricity', 'apogee_km', 'perigee_km', 'period_minutes'] as const

export type SatelliteFilter = { [Key in typeof keys[number]]: MinMaxEnabled }

export const defaultFilter: SatelliteFilter = {
  inclination_deg: { min: 0, max: 180, enabled: false },
  eccentricity: { min: 0, max: 1, enabled: false },
  apogee_km: { min: 0, max: 50_000, enabled: false },
  perigee_km: { min: 0, max: 50_000, enabled: false },
  period_minutes: { min: 0, max: 10_000, enabled: false },
}

const displayOptions = {
  inclination_deg: { input: { max: 180, min: 0, step: 'any' }, label: 'Inclination, degrees' },
  eccentricity: { input: { max: 1, min: 0, step: 'any' }, label: 'Eccentricity' },
  apogee_km: { input: { min: 0, step: 'any' }, label: 'Apogee, km' },
  perigee_km: { input: { min: 0, step: 'any' }, label: 'Perigee, km' },
  period_minutes: { input: { min: 0, step: 'any' }, label: 'Period, minutes' },
} satisfies { [Key in typeof keys[number]]: { input: { min: number, max?: number, step?: 'any' }, label: string } }

const SatellitesFilterFC: FC<{ currentFilter: SatelliteFilter, setFilter: (newFilter: SatelliteFilter) => void }> = ({ currentFilter, setFilter }) => {
  const [open, setOpen] = useState(false)
  const filterEnabled = Object.values(currentFilter).some(({ enabled }) => enabled)

  return (
    <>
      <Button onClick={() => setOpen(open => !open)}>{filterEnabled ? <FilterAlt /> : <FilterAltOffOutlined />}Filter</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            component: 'form',
            onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const formData = new FormData(event.currentTarget)
              const formJson = Object.fromEntries(formData.entries()) as { [Key in `${keyof SatelliteFilter}-${keyof MinMaxEnabled}`]: string }
              setOpen(false)
              setFilter(Object.fromEntries(keys.map(key => [key, { min: +formJson[`${key}-min`], max: +formJson[`${key}-max`], enabled: formJson[`${key}-enabled`] === 'on' }])) as SatelliteFilter)
            },
          },
        }}
      >
        <DialogTitle>Filter satellites to display</DialogTitle>
        <DialogContent>
          <Grid2 container spacing={2} padding='1ch'>
            {Object.entries(currentFilter).map(([key, { enabled, min, max }]) => {
              const options = displayOptions[key as keyof SatelliteFilter]
              return (
                <Fragment key={key}>
                  <Grid2 size={4}>
                    <FormControlLabel control={<Checkbox defaultChecked={enabled} name={`${key}-enabled`} />} label={options.label} />
                  </Grid2>
                  <Grid2 size={4}>
                    <TextField
                      label='Minimum'
                      type='number'
                      name={`${key}-min`}
                      defaultValue={min}
                      required
                      slotProps={{
                        htmlInput: {
                          ...options.input,
                        }
                      }}
                    />
                  </Grid2>
                  <Grid2 size={4}>
                    <TextField
                      label='Maximum'
                      type='number'
                      name={`${key}-max`}
                      defaultValue={max}
                      required
                      slotProps={{
                        htmlInput: {
                          ...options.input,
                        }
                      }}
                    />
                  </Grid2>
                </Fragment>
              )
            })}
          </Grid2>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant='contained' type='submit'>Apply</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export const SatellitesFilter = memo(SatellitesFilterFC)
