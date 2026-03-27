import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const f = createUploadthing()

export const ourFileRouter = {
  articlePhoto: f({ image: { maxFileSize: '2MB', maxFileCount: 1 } })
    .middleware(async () => {
      const session = await getServerSession(authOptions)
      if (!session) throw new Error('Non autorisé')
      return {}
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
