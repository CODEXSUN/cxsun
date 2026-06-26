import type { SliderOptions, SliderItem } from './slider-payload.types.js'

export type SiteSliderStatus = 'draft' | 'published' | 'archived'

export interface SiteSlider {
  id: number
  uuid: string
  tenant_id: number
  name: string
  slug: string
  placement: string
  status: SiteSliderStatus
  is_primary: boolean
  sort_order: number
  options: SliderOptions
  slides: SliderItem[]
  created_by: string
  updated_by: string | null
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

export interface SiteSliderInput {
  uuid?: string
  name?: string
  slug?: string
  placement?: string
  status?: SiteSliderStatus
  is_primary?: boolean
  isPrimary?: boolean
  sort_order?: number
  options?: SliderOptions
  slides?: SliderItem[]
}
