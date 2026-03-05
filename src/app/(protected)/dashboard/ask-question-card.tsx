'use client'
import MDEditor from '@uiw/react-md-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import useProject from '@/hooks/use-project'
import Image from 'next/image'
import React from 'react'
import { askQuestion } from './actions'
import CodeReferences from './code-references'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import useRefetch from '@/hooks/use-refetch'


const AskQuestionCard = () => {

    const { project } = useProject()
    const [question, setQuestion] = React.useState('')
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [fileReferences, setFileReferences] = React.useState<{ filename: string, sourceCode: string, summary: string }[]>([])
    const [answer, setAnswer] = React.useState('')
    const saveAnswer = api.project.saveAnswer.useMutation()

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setAnswer('')
        setFileReferences([])
        if (!project?.id) return
        setLoading(true)

        try {
            const { output, fileReferences } = await askQuestion(question, project.id)
            setOpen(true)
            setFileReferences(fileReferences)

            setLoading(false)

            for await (const chunk of output) {
                if (chunk) {
                    setAnswer(prev => prev + chunk)
                }
            }
        } catch (err) {
            console.error("Error asking question:", err)
        }
    }

    const refetch = useRefetch()

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className='sm:max-w-[75vw]'>
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <DialogTitle>
                                <Image src='/logo.png' alt='Diagnose' width={40} height={40} />
                            </DialogTitle>
                            <Button disabled={saveAnswer.isPending} variant='outline' onClick={() => {
                                saveAnswer.mutate({
                                    projectId: project!.id,
                                    question,
                                    answer,
                                    fileReferences
                                }, {
                                    onSuccess: () => {
                                        toast.success("Answer saved successfully!")
                                        refetch()
                                    },
                                    onError: () => {
                                        toast.error('Failed to save answer!')
                                    }
                                })
                            }}>
                                Save Answer
                            </Button>
                        </div>
                    </DialogHeader>
                    <MDEditor.Markdown source={answer} className='max-h-[35vh] overflow-auto max-w-7xl rounded-md' />
                    <CodeReferences fileReferences={fileReferences} />
                    <Button type='button' onClick={() => { setOpen(false) }}>
                        Close
                    </Button>
                </DialogContent>
            </Dialog>
            <Card className='relative col-span-3'>
                <CardHeader>
                    <CardTitle>Ask a Question</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit}>
                        <Textarea placeholder='Which file should I edit to change the home page?' value={question} onChange={e => setQuestion(e.target.value)} />
                        <div className="h-4"></div>
                        <Button type='submit' disabled={loading}>Ask Diagnose!</Button>
                    </form>
                </CardContent>
            </Card>
        </>
    )
}

export default AskQuestionCard











