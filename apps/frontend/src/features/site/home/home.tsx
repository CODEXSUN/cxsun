import { FullScreenSlider } from 'src/components/blocks/slider/FullScreenSlider'
import { SiteSection } from '../developer/site-section'
import type { TenantStaticSiteContent } from '../domain/site-content'
import { homeSliderData } from './home-slider-data'

interface HomePageProps {
  developerMode: boolean
  tenantSite: TenantStaticSiteContent | null
}

export function HomePage({ developerMode, tenantSite }: HomePageProps) {
  const slider = tenantSite?.sliders?.find((item) => item.placement === 'home-slider') ?? tenantSite?.sliders?.[0] ?? homeSliderData

  return (
    <main>
      <SiteSection className="relative" developerMode={developerMode} name="home-slider">
        <FullScreenSlider slides={slider.slides} options={slider.options} />
      </SiteSection>
    </main>
  )
}
