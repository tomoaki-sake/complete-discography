---
to: src/components/<%= path %>/<%= componentName %>/<%= componentName %>.tsx
---
import React from 'react'

type <%= componentName %>Props = {
  name: string
}

export const <%= componentName %>: React.FC<<%= componentName %>Props> = ({ name }) => {
  return <div><%= componentName %></div>
}
