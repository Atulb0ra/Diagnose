import {z} from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { pollCommits } from "@/lib/github";
import { checkCredits, indexGithubRepo } from "@/lib/github-loader";
import { supabaseAdmin } from "@/server/supabase";


export const projectRouter = createTRPCRouter({
    createProject : protectedProcedure.input(
        z.object({
            name : z.string(),
            githubUrl: z.string(),
            githubToken : z.string().optional()
        })
    ).mutation(async ({ctx, input}) => {

        const user = await ctx.db.user.findUnique({
            where : {
                id : ctx.user.userId!
            },
            select : {
                credits : true
            }
        })
        if(!user) {
            throw new Error('User not found')
        }

        const currentCredits = user.credits || 0
        const fileCount = await checkCredits(input.githubUrl, input.githubToken)
        if(currentCredits < fileCount){
            throw new Error(`Not enough credits.`)

        }

        const project = await ctx.db.project.create({
           data : {
            githubUrl : input.githubUrl,
            name: input.name,
            userToProjects : {
                create : {
                    userId : ctx.user.userId!,
                }
            }
           }
        })

        // Start background jobs WITHOUT awaiting - return immediately
        void indexGithubRepo(project.id, input.githubUrl, input.githubToken).catch(err => 
          console.error(`Failed to index repo ${project.id}:`, err)
        )
        void pollCommits(project.id).catch(err => 
          console.error(`Failed to poll commits ${project.id}:`, err)
        )

        await ctx.db.user.update({
            where : {
                id : ctx.user.userId!
            },
            data : {
                credits : {
                    decrement : fileCount
                }
            }   
        })
        
        return project;
    }),

    getProjects : protectedProcedure.query(async ({ctx}) => {
        return await ctx.db.project.findMany({
            where: {
                userToProjects : {
                    some : {
                        userId : ctx.user.userId!
                    }
                },
                deletedAt : null
            }
        })
    }),


    getCommits : protectedProcedure.input(z.object({
        projectId : z.string()
    })).query(async ({ctx, input}) => {
        pollCommits(input.projectId).then().catch(console.error)
        
        return await ctx.db.commit.findMany({where : {projectId : input.projectId}})
    }),


    saveAnswer : protectedProcedure.input(z.object({
        projectId : z.string(),
        question : z.string(),
        answer : z.string(),
        fileReferences : z.any()
    })).mutation(async ({ctx, input}) => {
        const answer = await ctx.db.question.create({
            data : {
                answer : input.answer,
                fileReferences : input.fileReferences,
                projectId : input.projectId,
                question : input.question,
                userId : ctx.user.userId!
            }
        })
        return answer
    }
    ),

    getQuestions : protectedProcedure.input(z.object({
        projectId : z.string()
    })).query(async ({ctx, input}) => {
        return await ctx.db.question.findMany({
            where : {
                projectId : input.projectId,
            },
            include : {
                user : true
            },
            orderBy : {
                createdAt : 'desc'
            }
        })
    }),

    uploadMeeting : protectedProcedure.input(z.object({
        projectId : z.string(),
        meetingUrl : z.string(),
        name : z.string()
    })).mutation(async ({ctx, input}) => {
        const meeting = await ctx.db.meeting.create({
            data : {
                meetingUrl: input.meetingUrl,
                projectId : input.projectId,
                name : input.name,
                status : 'PROCESSING'
            }
        })
        return meeting;
    }),

    getMeetings : protectedProcedure.input(z.object({
        projectId : z.string()
    })).query(async ({ctx, input}) => {
        return await ctx.db.meeting.findMany({
            where : {
                projectId : input.projectId
            },
            include : {
                issues : true
            }
        })
    }),

    deleteMeeting : protectedProcedure.input(z.object({
        meetingId : z.string()
    })).mutation(async ({ctx, input}) => {
        await ctx.db.meeting.delete({
            where : {
                id : input.meetingId
            }
        })
    }),

    getMeetingById : protectedProcedure.input(z.object({
        meetingId : z.string()
    })).query(async ({ctx, input}) => {
        return await ctx.db.meeting.findUnique({
            where : {
                id : input.meetingId
            },
            include : {
                issues : true
            }
        })
    }),


    createMeetingUploadUrl: protectedProcedure
  .input(
    z.object({
      fileName: z.string(),
      contentType: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const filePath = `meetings/${Date.now()}-${input.fileName}`

    const { data, error } = await supabaseAdmin.storage
      .from('audio-files')
      .createSignedUploadUrl(filePath)

    if (error) throw new Error(error.message)

    return {
      signedUrl: data.signedUrl,
      path: filePath,
    }
  }),

  archiveProject : protectedProcedure.input(z.object({
    projectId : z.string()
  })).mutation(async ({ctx, input}) => {
      return await ctx.db.project.update({
        where : {
            id : input.projectId
        },
        data : {
            deletedAt : new Date()
        }
      })
  }),

  getTeamMembers : protectedProcedure.input(z.object({
    projectId : z.string()
    })).query(async ({ctx, input}) => {
        return await ctx.db.userToProject.findMany({
            where : {
                projectId : input.projectId
            },
            include : {
                user : true
            }
        })
    }),

    getCredits : protectedProcedure.query(async ({ctx}) => {
        return await ctx.db.user.findUnique({
            where : {
                id : ctx.user.userId!
            },
            select : {
                credits : true
            }
        })
    }),

    checkCredits : protectedProcedure.input(z.object({
        githubUrl : z.string(),
        githubToken : z.string().optional()
    })).mutation(async ({ctx, input}) => {
        const fileCount =  await checkCredits(input.githubUrl, input.githubToken)
        const userCredits = await ctx.db.user.findUnique({
            where : {
                id : ctx.user.userId!
            },
            select : {
                credits : true 
            }
        })
        return {fileCount, userCredits : userCredits?.credits || 0}

    }),

    getProjectStatus : protectedProcedure.input(z.object({
        projectId : z.string()
    })).query(async ({ctx, input}) => {
        const project = await ctx.db.project.findUnique({
            where : { id: input.projectId },
            select : {
                status: true,
                commits: {
                    select: { id: true }
                },
                sourceCodeEmbeddings: {
                    select: { id: true }
                }
            }
        })
        const status = project?.status as string | undefined;
        
        return {
            status,
            commitCount: project?.commits.length || 0,
            fileCount: project?.sourceCodeEmbeddings.length || 0
        }
    })
})

