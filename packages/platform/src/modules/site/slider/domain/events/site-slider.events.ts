export type SiteSliderEventName = 'site.slider.created' | 'site.slider.updated' | 'site.slider.deleted'

export interface SiteSliderDomainEvent {
  name: SiteSliderEventName
  tenantId: number
  sliderUuid: string
  occurredAt: string
}

export function siteSliderEvent(name: SiteSliderEventName, tenantId: number, sliderUuid: string): SiteSliderDomainEvent {
  return {
    name,
    tenantId,
    sliderUuid,
    occurredAt: new Date().toISOString(),
  }
}
