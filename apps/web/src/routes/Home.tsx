import { useSiteFaqs } from '@/content/SiteContentProvider'
import { useSeo } from '@/lib/seo'
import { AirflowStory } from '@/routes/home/AirflowStory'
import { Faq } from '@/routes/home/Faq'
import { FinalCta } from '@/routes/home/FinalCta'
import { Hero } from '@/routes/home/Hero'
import { Plans } from '@/routes/home/Plans'
import {
  AssuranceSection,
  CoverageSection,
  InsightsSection,
  PerformanceSection,
  ProductPreviewSection,
} from '@/routes/home/PremiumSections'
import { Process } from '@/routes/home/Process'
import { ProofStrip } from '@/routes/home/Proof'
import { Segments } from '@/routes/home/Segments'
import { ServiceStack } from '@/routes/home/ServiceStack'
import {
  DispatchCoverageSection,
  MeasuredBand,
  SequenceRail,
  SetpointSection,
  SystemMapSection,
} from '@/routes/home/SignatureSections'
import { Voices } from '@/routes/home/Voices'
import { Work } from '@/routes/home/Work'
import {
  FinalCtaBandSection,
  ProcessDepthSection,
  ServiceGridSection,
  TrustStripSection,
  VoicesRailSection,
} from '@/routes/home/PremiumAnimations'

/** Phase 3 home page. Site chrome lives in SiteLayout. */
export function Home() {
  const faqs = useSiteFaqs()
  useSeo({
    path: '/',
    faqs: faqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
  })

  return (
    <>
      <Hero />
      <ProofStrip />
      <ServiceStack />
      <SetpointSection />
      <AirflowStory />
      <PerformanceSection />
      <MeasuredBand />
      <TrustStripSection />
      <Segments />
      <AssuranceSection />
      <ServiceGridSection />
      <Process />
      <ProcessDepthSection />
      <SequenceRail />
      <Work />
      <SystemMapSection />
      <CoverageSection />
      <DispatchCoverageSection />
      <Plans />
      <ProductPreviewSection />
      <InsightsSection />
      <VoicesRailSection />
      <Voices />
      <Faq />
      <FinalCta />
      <FinalCtaBandSection />
    </>
  )
}
