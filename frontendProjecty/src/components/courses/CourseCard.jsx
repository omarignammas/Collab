import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Calendar, User, Youtube, Users } from 'lucide-react'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card'
import { Button } from '../ui/button'
import { CircularProgress } from '../shared/CircularProgress'
import { Badge } from '../ui/badge'
import { useToast } from '../../hooks/use-toast'
import courseService from '../../services/courseService'
import { format } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog"

export const CourseCard = ({ course, onDelete }) => {
  const [progress, setProgress] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const data = await courseService.getCourseProgress(course.id)
        setProgress(data)
      } catch (error) {
        console.error('Error fetching progress:', error)
      }
    }
    fetchProgress()
  }, [course.id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await courseService.deleteCourse(course.id)

      toast({
        title: "Project deleted",
        description: `"${course.title}" has been successfully deleted.`,
        variant: "default",
      })

      onDelete(course.id)
      setOpen(false)
    } catch (error) {
      console.error('Error deleting course:', error)

      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete project. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleCardClick = () => {
    navigate(`/projects/${course.id}`)
  }

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    setOpen(true)
  }

  return (
    <Card
      onClick={handleCardClick}
      className="group cursor-pointer overflow-hidden border-border/80 bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      {course.thumbnailUrl && (
        <img
          src={course.thumbnailUrl}
          alt=""
          className="aspect-video w-full object-cover"
        />
      )}

      {/* HEADER */}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {course.colorTag && (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: course.colorTag }}
              />
            )}
            <CardTitle className="min-w-0 flex-1 truncate text-lg text-foreground transition-colors group-hover:text-primary">
              {course.title}
            </CardTitle>
            {course.youtubePlaylistId && (
              <Badge variant="outline" className="shrink-0 gap-1 border-destructive/30 bg-destructive/10 text-destructive">
                <Youtube className="h-3 w-3" />
                YouTube
              </Badge>
            )}
            {!course.isOwner && (
              <Badge variant="outline" className="shrink-0 gap-1 border-primary/30 bg-primary/10 text-primary">
                <Users className="h-3 w-3" />
                shared
              </Badge>
            )}
          </div>

          {course.isOwner && (
            <AlertDialog open={open} onOpenChange={setOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteClick}
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the project
                    <strong className="text-foreground"> "{course.title}" </strong>
                    and all its tasks.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete()
                    }}
                    disabled={deleting}
                    className='bg-destructive hover:bg-destructive/90'
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>

      {/* CONTENT */}
      <CardContent className="space-y-4">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {course.description || 'No description'}
        </p>

        {progress && (
          <div className="flex items-center gap-4">
            <CircularProgress percentage={Math.round(progress.progressPercentage)} size={64} strokeWidth={6} color="blue" />
            <div className="text-xs text-muted-foreground">
              <p>{progress.completedTasks} completed</p>
              <p>{progress.totalTasks} total</p>
            </div>
          </div>
        )}
      </CardContent>

      {/* FOOTER */}
      <CardFooter className="flex items-center justify-between border-t border-border/60 pt-4">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(course.createdAt), 'MMM dd, yyyy')}
          </span>
          {course.instructorName && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {course.instructorName}
            </span>
          )}
          {!course.isOwner && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              by {course.ownerName}
            </span>
          )}
        </div>

        {progress && (
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-primary"
          >
            {progress.totalTasks} tasks
          </Badge>
        )}
      </CardFooter>
    </Card>
  )
}

export default CourseCard
