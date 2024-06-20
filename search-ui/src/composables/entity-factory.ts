import { computed, reactive } from 'vue'
// Local
import { BusinessStatuses, BusinessTypes, CorpTypeCd } from '@/enums'
import { getEntity } from '@/requests'
import { CorpInfoArray } from '@/resources'
import { EntityI } from '@/interfaces/entity'

const entity = reactive({
  bn: '',
  identifier: '',
  incorporationDate: '',
  legalType: null,
  name: '',
  status: null,
  _error: null,
  _loading: false,
} as EntityI)

export const useEntity = () => {
  // functions, etc. to manage the entity state
  const clearEntity = () => {
    entity.bn = ''
    entity.identifier = ''
    entity.incorporationDate = ''
    entity.legalType = null
    entity.name = ''
    entity.status = null
    entity._error = null
    entity._loading = false
    entity.goodStanding = true
    entity.inDissolution = false
  }
  const loadEntity = async (identifier: string) => {
    entity._loading = true
    const entityInfo = await getEntityInfo(identifier)
    if (entityInfo) setEntity(entityInfo)
    entity._loading = false
  }
  const getEntityCode = (description: string): CorpTypeCd => {
    const item = CorpInfoArray.find(obj => (description === obj.fullDesc))
    return (item && item.corpTypeCd) || null
  }
  const getEntityDescription = (entityType: CorpTypeCd) => {
    const item = CorpInfoArray.find(obj => (entityType === obj.corpTypeCd))
    return (item && item.fullDesc) || ''
  }
  const getEntityName = (entity: EntityI) => {
    // return entity.name
    if (!['GP', 'SP'].includes(entity.legalType)) {
      return entity.name
    }
    const primaryName = entity.alternateNames?.find(val => val.identifier === entity.identifier)
    return primaryName?.name || entity.name
  }
  const getEntityInfo = async (identifier: string) => {
    // call legal api for entity data
    const entityInfo = await getEntity(identifier)
    if (entityInfo.error) {
      entity._error = entityInfo.error
      return null
    }
    const resp_entity: EntityI = {
      alternateNames: entityInfo.business.alternateNames,
      bn: entityInfo.business.taxId || '',
      identifier: entityInfo.business.identifier,
      incorporationDate: entityInfo.business.foundingDate,
      legalType: entityInfo.business.legalType,
      name: entityInfo.business.legalName,
      status: entityInfo.business.state,
      goodStanding: entityInfo.business.goodStanding,
      inDissolution: entityInfo.business.inDissolution
    }
    return resp_entity
  }
  const setEntity = (newEntity: EntityI) => {
    entity.bn = newEntity.bn || ''
    entity.identifier = newEntity.identifier
    entity.incorporationDate = newEntity.incorporationDate || ''
    entity.legalType = newEntity.legalType
    entity.name = getEntityName(newEntity)
    entity.status = newEntity.status
    entity.goodStanding = newEntity.goodStanding
    entity.inDissolution = newEntity.inDissolution
  }

  const isActive = computed(() => {
    return entity.status == BusinessStatuses.ACTIVE
  })

  const isBComp = computed(() => {
    return entity.legalType == CorpTypeCd.BENEFIT_COMPANY
  })

  const isCoop = computed(() => {
    return entity.legalType == CorpTypeCd.COOP
  })

  const isBC = computed(() => {
    return entity.legalType == CorpTypeCd.BC_COMPANY
  })

  const isFirm = computed(() => {
    return entity.legalType == CorpTypeCd.SOLE_PROP || 
    entity.legalType == CorpTypeCd.PARTNERSHIP
  })

  const entityTitle = computed((): string => {
    return isCoop.value ? 'Cooperative Association' : 'Company'
  })

  const actTitle = computed((): string => {
    if (isFirm.value) {
      return 'Partnership Act'
    }
    return isCoop.value ? 'Cooperative Association Act' : 'Business Corporations Act'
  })

  const entityNumberLabel = computed(() => {
    // more rules tbd
    return isCoop.value || isBComp.value ? 'Incorporation Number' : 'Registration Number'
  })

  const corpTypes = computed(() => {
    const nrTypeCodes = [CorpTypeCd.BC_CORPORATION, CorpTypeCd.NR_SOLE_PROP]
    const corpSet = new Set(CorpInfoArray.map((corp) => !nrTypeCodes.includes(corp.corpTypeCd) ? corp.fullDesc : null))
    corpSet.delete(null)
    return [...corpSet]
  })

  const learBusinessTypes = computed(() => {
    return Object.keys(BusinessTypes).map((key) => {
      if (BusinessTypes[key] !== BusinessTypes.BC_LIMITED_COMPANY) return BusinessTypes[key]
    })
  })

  const warnings = computed(() => {
    const warnings = []
    if (entity.inDissolution) {
      warnings.push('INVOLUNTARY_DISSOLUTION')
    }
    if (!entity.goodStanding) {
      warnings.push('NOT_IN_GOOD_STANDING')
    }
    return warnings
  })

  return {
    entity,
    clearEntity,
    getEntityCode,
    getEntityDescription,
    getEntityInfo,
    loadEntity,
    setEntity,
    isActive,
    isBComp,
    isCoop,
    isFirm,
    isBC,
    entityTitle,
    actTitle,
    entityNumberLabel,
    corpTypes,
    learBusinessTypes,
    warnings
  }
}