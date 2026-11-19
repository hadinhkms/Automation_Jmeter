import type { TemplateItem } from '../../../models/templateGallery'
import { ecommerceTemplate } from './ecommerceTemplate'
import { microserviceTemplate, oauth2SoakTemplate } from './apiTemplates'
import { steppingStressTemplate, graphqlTemplate } from './stressGraphqlTemplates'
import { websocketTemplate } from './websocketTemplate'

export const templates: TemplateItem[] = [
  ecommerceTemplate,
  microserviceTemplate,
  oauth2SoakTemplate,
  steppingStressTemplate,
  graphqlTemplate,
  websocketTemplate,
]
