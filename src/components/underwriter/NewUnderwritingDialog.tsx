import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useCreateUnderwriting } from '@/hooks/useUnderwritings'

const schema = z.object({
  property_name: z.string().min(1, 'Required'),
  address: z.string().min(1, 'Required'),
  submarket: z.string().min(1, 'Required'),
  building_size_sf: z.coerce.number().optional(),
  year_built: z.coerce.number().optional(),
  land_size_ac: z.coerce.number().optional(),
  proposed_ask_price: z.coerce.number().optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated?: (id: string) => void
}

const SUBMARKETS = ['SE', 'NE', 'Balzac', 'Rocky View', 'Other']

export function NewUnderwritingDialog({ open, onOpenChange, onCreated }: Props) {
  const create = useCreateUnderwriting()
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    const result = await create.mutateAsync(values)
    onOpenChange(false)
    onCreated?.(result.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            New Underwriting
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Property Name *</Label>
              <Input {...register('property_name')} placeholder="e.g. 123 Industrial Park" />
              {errors.property_name && (
                <p className="text-xs text-destructive">{errors.property_name.message}</p>
              )}
            </div>

            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Address *</Label>
              <Input {...register('address')} placeholder="Full street address" />
              {errors.address && (
                <p className="text-xs text-destructive">{errors.address.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Submarket *</Label>
              <Select onValueChange={(v) => setValue('submarket', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {SUBMARKETS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.submarket && (
                <p className="text-xs text-destructive">{errors.submarket.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Building Size (SF)</Label>
              <Input {...register('building_size_sf')} type="number" placeholder="e.g. 50000" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Year Built</Label>
              <Input {...register('year_built')} type="number" placeholder="e.g. 1998" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Land Size (Acres)</Label>
              <Input {...register('land_size_ac')} type="number" step="0.01" placeholder="e.g. 3.5" />
            </div>

            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Proposed Ask Price ($)</Label>
              <Input {...register('proposed_ask_price')} type="number" placeholder="e.g. 8500000" />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={create.isPending}
            >
              {create.isPending ? 'Creating…' : 'Create Underwriting'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
