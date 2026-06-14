import request from '@/utils/request'

export const novelApi = {
  list() {
    return request.get('/novel/list')
  },

  get(id) {
    return request.get(`/novel/${id}`)
  },

  create(data) {
    return request.post('/novel', data)
  },

  update(id, data) {
    return request.put(`/novel/${id}`, data)
  },

  delete(id) {
    return request.delete(`/novel/${id}`)
  }
}

export const chapterApi = {
  list(novelId) {
    return request.get(`/chapter/list/${novelId}`)
  },

  get(id) {
    return request.get(`/chapter/${id}`)
  },

  create(novelId, data) {
    return request.post(`/chapter/${novelId}`, data)
  },

  update(id, data) {
    return request.put(`/chapter/${id}`, data)
  },

  delete(id) {
    return request.delete(`/chapter/${id}`)
  }
}

export const profileApi = {
  get() {
    return request.get('/profile')
  },

  update(data) {
    return request.put('/profile', data)
  }
}

export const providerApi = {
  list() {
    return request.get('/provider/list')
  },

  add(data) {
    return request.post('/provider', data)
  },

  update(id, data) {
    return request.put(`/provider/${id}`, data)
  },

  delete(id) {
    return request.delete(`/provider/${id}`)
  }
}

export const aiApi = {
  generateOutline(data) {
    return request.post('/ai/generate-outline', data)
  },

  generateChapter(data) {
    return request.post('/ai/generate-chapter', data)
  },

  continueWriting(data) {
    return request.post('/ai/continue-writing', data)
  }
}

export const styleApi = {
  list() { return request.get('/style/list') },
  create(data) { return request.post('/style', data) },
  update(id, data) { return request.put(`/style/${id}`, data) },
  delete(id) { return request.delete(`/style/${id}`) }
}

export const readerApi = {
  browse() { return request.get('/reader/browse') },
  search(q) { return request.get('/reader/search', { params: { q } }) },
  byGenre(g) { return request.get(`/reader/genre/${g}`) },
  genres() { return request.get('/reader/genres') },
  novel(id) { return request.get(`/reader/novel/${id}`) },
  follow(aid) { return request.post(`/reader/follow/${aid}`) },
  bookmark(nid) { return request.post(`/reader/bookmark/${nid}`) },
  bookmarks() { return request.get('/reader/bookmarks') },
  publish(nid, published) { return request.put(`/reader/novel/${nid}/publish`, { published }) }
}
