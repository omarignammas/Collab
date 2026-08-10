import { useState, useEffect, useMemo } from 'react';
import { GraduationCap, Plus, Search, Filter, Youtube } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import CourseCard from '../components/courses/CourseCard';
import CreateCourseDialog from '../components/courses/CreateCourseDialog';
import ImportYoutubePlaylistDialog from '../components/courses/ImportYoutubePlaylistDialog';
import courseService from '../services/courseService';
import termService from '../services/termService';
import { StatCard } from '../components/shared/StatCard';
import PageHero from '../components/shared/PageHero';

export const CoursesPage = () => {
  const [coursesWithProgress, setCoursesWithProgress] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [termFilter, setTermFilter] = useState('current');
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalTasks: 0,
    completedTasks: 0,
    overallProgress: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [size] = useState(6);
  const [totalPages, setTotalPages] = useState(0);

  const currentTerm = useMemo(() => terms.find((t) => t.isCurrent), [terms]);

  const fetchTerms = async () => {
    try {
      const result = await termService.getAllTerms({ size: 100 });
      setTerms(result.content || []);
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const fetchCourses = async (pageNumber = page) => {
    setLoading(true);
    try {
      const result = await courseService.getAllCourses({
        page: pageNumber,
        size,
        sortField: 'id',
        direction: 'DESC',
      });

      await fetchCoursesWithProgress(result.content);

      setTotalPages(result.totalPages);
      setPage(result.page);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoursesWithProgress = async (coursesList) => {
    const progressPromises = coursesList.map(async (course) => {
      try {
        const progress = await courseService.getCourseProgress(course.id);
        return {
          ...course,
          progress: progress.progressPercentage,
          totalTasks: progress.totalTasks,
          completedTasks: progress.completedTasks,
        };
      } catch (error) {
        console.error(`Error fetching progress for course ${course.id}:`, error);
        return {
          ...course,
          progress: 0,
          totalTasks: 0,
          completedTasks: 0,
        };
      }
    });

    const coursesWithProgressData = await Promise.all(progressPromises);
    setCoursesWithProgress(coursesWithProgressData);

    calculateStats(coursesWithProgressData);
  };

  const calculateStats = (coursesWithProgressData) => {
    let totalCourses = coursesWithProgressData.length;
    let completedCourses = 0;
    let totalTasks = 0;
    let completedTasks = 0;

    coursesWithProgressData.forEach(course => {
      totalTasks += course.totalTasks;
      completedTasks += course.completedTasks;

      if (course.progress === 100) {
        completedCourses++;
      }
    });

    const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const courseCompletionRate = totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    setStats({
      totalCourses,
      completedCourses,
      totalTasks,
      completedTasks,
      overallProgress: Math.round(overallProgress),
      courseCompletionRate: Math.round(courseCompletionRate),
      taskCompletionRate: Math.round(taskCompletionRate),
    });
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  useEffect(() => {
    fetchCourses(page);
  }, [page]);

  useEffect(() => {
    // No current term to scope to — fall back to showing everything.
    if (termFilter === 'current' && !currentTerm && terms.length > 0) {
      setTermFilter('all');
    }
  }, [terms, currentTerm, termFilter]);

  useEffect(() => {
    let filtered = [...coursesWithProgress];

    if (termFilter === 'current' && currentTerm) {
      filtered = filtered.filter((course) => course.termId === currentTerm.id);
    }

    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter === 'completed') {
      filtered = filtered.filter(course => course.progress === 100);
    } else if (statusFilter === 'in-progress') {
      filtered = filtered.filter(course => course.progress < 100);
    }

    setFilteredCourses(filtered);
  }, [searchTerm, statusFilter, coursesWithProgress, termFilter, currentTerm]);

  const handleCourseCreated = () => {
    fetchTerms();
    fetchCourses(page);
    setIsCreateDialogOpen(false);
    setIsImportDialogOpen(false);
  };

  const handleCourseDeleted = () => {
    fetchCourses(page);
  };

  return (
    <div className="accent-purple w-full px-4 py-10">
      <PageHero
        icon={GraduationCap}
        title="Projects"
        subtitle="Keep every project, task, and teammate moving together."
        action={
          <div className="flex w-full flex-col gap-2 min-[370px]:flex-row sm:w-auto">
            <Button className="w-full min-[370px]:w-auto" variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <Youtube className="h-4 w-4 mr-2" />
              Import YouTube Playlist
            </Button>
            <Button className="w-full min-[370px]:w-auto" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New project
            </Button>
          </div>
        }
      />

      {/* Term tabs — mirrors "this semester / all" saved views */}
      {terms.length > 0 && (
        <div className="mb-6 inline-flex gap-1 rounded-lg border border-border/80 bg-card p-1">
          <button
            type="button"
            onClick={() => setTermFilter('current')}
            disabled={!currentTerm}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              termFilter === 'current' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {currentTerm ? currentTerm.name : 'this term'}
          </button>
          <button
            type="button"
            onClick={() => setTermFilter('all')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              termFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            all
          </button>
        </div>
      )}

      {/* Stats Cards with Circular Progress */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[196px] animate-pulse rounded-xl border border-border/80 bg-card" />
          ))
        ) : (
          <>
            <StatCard
              title="Overall Progress"
              subtitle={`${stats.completedTasks}/${stats.totalTasks} tasks done`}
              percentage={stats.overallProgress}
              color="blue"
            />
            <StatCard
              title="Total projects"
              subtitle={`${stats.completedCourses} completed`}
              percentage={stats.courseCompletionRate || 0}
              color="purple"
            />
            <StatCard
              title="Tasks Completed"
              subtitle={`out of ${stats.totalTasks} total`}
              percentage={stats.taskCompletionRate || 0}
              color="green"
            />
            <StatCard
              title="Projects achieved"
              subtitle={`${stats.courseCompletionRate || 0}% completion rate`}
              percentage={stats.courseCompletionRate || 0}
              color="orange"
            />
          </>
        )}
      </div>

      {/* Filters Row */}
      <div className="mb-6">
        <div className="flex flex-col gap-3 md:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        {(searchTerm || statusFilter !== 'all') && (
          <p className="mt-3 text-sm text-muted-foreground">
            Found {filteredCourses.length} project(s)
            {statusFilter !== 'all' && ` • Filter: ${statusFilter === 'completed' ? 'Completed' : 'In Progress'}`}
          </p>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[220px] animate-pulse rounded-xl border border-border/80 bg-card" />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          {searchTerm || statusFilter !== 'all' ? (
            <>
              <h3 className="mb-2 text-lg font-semibold text-foreground">No projects found</h3>
              <p className="mb-4 text-muted-foreground">
                Try adjusting your search or filters
              </p>
              <div className="flex justify-center gap-2">
                {searchTerm && (
                  <Button variant="outline" onClick={() => setSearchTerm('')}>
                    Clear Search
                  </Button>
                )}
                {statusFilter !== 'all' && (
                  <Button variant="outline" onClick={() => setStatusFilter('all')}>
                    Clear Filter
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <h3 className="mb-2 text-lg font-semibold text-foreground">No projects yet</h3>
              <p className="mb-4 text-muted-foreground">
                Add your first project to start organizing work.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create project
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Courses Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course, index) => (
              <div
                key={course.id}
                className="animate-in fade-in slide-in-from-bottom-3 duration-500"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
              >
                <CourseCard
                  course={course}
                  onDelete={handleCourseDeleted}
                />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>

              <span className="font-numeric text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>

              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Course Dialog */}
      <CreateCourseDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCourseCreated={handleCourseCreated}
      />

      {/* Import YouTube Playlist Dialog */}
      <ImportYoutubePlaylistDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onCourseCreated={handleCourseCreated}
      />
    </div>
  );
};

export default CoursesPage;
