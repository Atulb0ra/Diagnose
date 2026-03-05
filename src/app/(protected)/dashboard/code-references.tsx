'use client'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import lucario from 'react-syntax-highlighter/dist/esm/styles/prism/lucario'
import React from 'react'

type Props = {
    fileReferences : { filename: string, sourceCode: string, summary: string }[]
}
const CodeReferences = ({fileReferences} : Props) => {
    const [tab, setTab] = React.useState(fileReferences[0]?.filename)
    if(fileReferences.length === 0) return null
  return (
    <div className='sm:max-w-[72vw]'>
        <Tabs value={tab} onValueChange={setTab}>
            <div className='overflow-x-auto flex gap-2 bg-gray-200 p-1 rounded-md'>
                {fileReferences.map(ref => (
                    <button onClick={() => setTab(ref.filename)} key={ref.filename} className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap text-muted-foreground hover:bg-muted', {
                        'bg-primary text-primary-foreground': tab === ref.filename,
                    })} >
                        {ref.filename}
                    </button>
                ))}
            </div>
            {fileReferences.map(ref => (
                <TabsContent key={ref.filename} value={ref.filename} className='max-h-[35vh] overflow-auto max-w-7xl rounded-md'>
                    <SyntaxHighlighter language='typescript' style={lucario} wrapLines>
                        {ref.sourceCode}
                    </SyntaxHighlighter>
                </TabsContent>
            ))}
        </Tabs>
    </div>
  )
}

export default CodeReferences
