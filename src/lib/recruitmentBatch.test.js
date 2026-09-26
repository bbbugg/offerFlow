import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ALL_RECRUITMENT_BATCHES,
  DEFAULT_RECRUITMENT_BATCH,
  matchesRecruitmentBatch,
  normalizeRecruitmentBatch,
  normalizeRecruitmentBatchFilter,
} from './recruitmentBatch.js'

test('missing and unknown recruitment batches fall back to other', () => {
  assert.equal(normalizeRecruitmentBatch(), DEFAULT_RECRUITMENT_BATCH)
  assert.equal(normalizeRecruitmentBatch(''), DEFAULT_RECRUITMENT_BATCH)
  assert.equal(normalizeRecruitmentBatch('未知批次'), DEFAULT_RECRUITMENT_BATCH)
})

test('known recruitment batches are preserved', () => {
  assert.equal(normalizeRecruitmentBatch(' 秋招 '), '秋招')
  assert.equal(normalizeRecruitmentBatch('补录'), '补录')
  assert.equal(normalizeRecruitmentBatch('社招'), '社招')
  assert.equal(normalizeRecruitmentBatch('日常'), '日常')
  assert.equal(normalizeRecruitmentBatchFilter(ALL_RECRUITMENT_BATCHES), ALL_RECRUITMENT_BATCHES)
})

test('all matches every job while a concrete batch uses normalized values', () => {
  assert.equal(matchesRecruitmentBatch({}, ALL_RECRUITMENT_BATCHES), true)
  assert.equal(matchesRecruitmentBatch({}, DEFAULT_RECRUITMENT_BATCH), true)
  assert.equal(matchesRecruitmentBatch({ recruitmentBatch: '春招' }, '春招'), true)
  assert.equal(matchesRecruitmentBatch({ recruitmentBatch: '春招' }, '秋招'), false)
})
