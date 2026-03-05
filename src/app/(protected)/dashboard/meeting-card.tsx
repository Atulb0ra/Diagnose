
'use client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Presentation, Upload } from 'lucide-react'
import React from 'react'
import { useDropzone } from 'react-dropzone'
import { api } from '@/trpc/react'
import useProject from '@/hooks/use-project'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {supabase} from '@/lib/supabase' 
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'

const MeetingCard = () => {
  const {project} = useProject()

  const processMeeting = useMutation({
    mutationFn : async (data : {meetingUrl: string, meetingId:string, projectId:string}) => {
     const {meetingUrl, meetingId, projectId} = data
     const response = await axios.post('/api/process-meeting', {meetingUrl, meetingId, projectId})
     return response.data
    }
  })
  const router = useRouter()
  const [isUploading, setIsUploading] = React.useState(false)
  const uploadMeeting = api.project.uploadMeeting.useMutation()

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a']
    },
    multiple: false,
    maxSize: 50_000_000,
    onDrop: async (acceptedFiles: File[]) => {
      if(!project) return
      setIsUploading(true)
      console.log(acceptedFiles)
      const file = acceptedFiles[0]
      if(!file) return

      const filePath = `meetings/${Date.now()}-${file.name}`

      const { error } = await supabase.storage
          .from('Diagnose')
          .upload(filePath, file)

        if (error) throw error

        // Get public URL
        const { data } = supabase.storage
          .from('Diagnose')
          .getPublicUrl(filePath)

        const publicUrl = data.publicUrl

        // Save in DB
        await uploadMeeting.mutate({
          projectId: project.id,
          meetingUrl: publicUrl,
          name: file.name,
        },{
        onSuccess : (meeting) => {
          toast.success('Meeting uploaded successfully!')
          router.push('/meetings')
          processMeeting.mutateAsync({
            meetingUrl: publicUrl,
            meetingId: meeting.id,
            projectId: project.id
          })
        },
        onError : (error) => {
          toast.error('Failed to upload meeting. Please try again.')
        }
      })
      setIsUploading(false)
    }
  })
  return (
    <Card className="col-span-2 p-10" {...getRootProps()}>
      {!isUploading && (
        <div className='flex flex-col items-center justify-center'>
          <Presentation className="h-10 w-10 animate-bounce" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            Create a new meeting
          </h3>
          <p className="mt-1 text-center text-sm text-gray-500">
            Analyse your meeting with Dionysus.
            <br />
            Powered by AI.
          </p>
          <div className="mt-6">
            <Button disabled={isUploading}>
              <Upload className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              Upload Meeting
              <input {...getInputProps()} />
            </Button>
          </div>
        </div>
      )}
      {isUploading && (
         <div className="flex flex-col items-center">
          <div className="loader mb-4" />
          <p className="text-sm text-gray-500">
            Uploading your meeting...
          </p>
        </div>
      )}
    </Card>
  )
}

export default MeetingCard
