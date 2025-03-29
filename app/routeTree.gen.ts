/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as ImportImport } from './routes/import'
import { Route as IndexImport } from './routes/index'
import { Route as CollectionCollectionIdImport } from './routes/collection.$collectionId'

// Create/Update Routes

const ImportRoute = ImportImport.update({
  id: '/import',
  path: '/import',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const CollectionCollectionIdRoute = CollectionCollectionIdImport.update({
  id: '/collection/$collectionId',
  path: '/collection/$collectionId',
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/import': {
      id: '/import'
      path: '/import'
      fullPath: '/import'
      preLoaderRoute: typeof ImportImport
      parentRoute: typeof rootRoute
    }
    '/collection/$collectionId': {
      id: '/collection/$collectionId'
      path: '/collection/$collectionId'
      fullPath: '/collection/$collectionId'
      preLoaderRoute: typeof CollectionCollectionIdImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/import': typeof ImportRoute
  '/collection/$collectionId': typeof CollectionCollectionIdRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/import': typeof ImportRoute
  '/collection/$collectionId': typeof CollectionCollectionIdRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/import': typeof ImportRoute
  '/collection/$collectionId': typeof CollectionCollectionIdRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/import' | '/collection/$collectionId'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/import' | '/collection/$collectionId'
  id: '__root__' | '/' | '/import' | '/collection/$collectionId'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  ImportRoute: typeof ImportRoute
  CollectionCollectionIdRoute: typeof CollectionCollectionIdRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  ImportRoute: ImportRoute,
  CollectionCollectionIdRoute: CollectionCollectionIdRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/import",
        "/collection/$collectionId"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/import": {
      "filePath": "import.tsx"
    },
    "/collection/$collectionId": {
      "filePath": "collection.$collectionId.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
