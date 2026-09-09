<?php

namespace App\Policies;

use App\Models\LearningPackage;
use App\Models\PackageSubject;
use App\Models\TeacherReplacementRequest;
use App\Models\User;

class TeacherReplacementRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->isActiveAdmin($user);
    }

    public function view(User $user, TeacherReplacementRequest $replacement): bool
    {
        return $this->isActiveAdmin($user)
            || ($user->role === 'student' && $user->status === 'active' && (int) $replacement->student_id === (int) $user->id);
    }

    public function create(User $user, LearningPackage $package, PackageSubject $subject): bool
    {
        return $user->role === 'student'
            && $user->status === 'active'
            && (int) $package->student_id === (int) $user->id
            && (int) $subject->learning_package_id === (int) $package->id;
    }

    public function review(User $user, TeacherReplacementRequest $replacement): bool
    {
        return $this->isActiveAdmin($user);
    }

    private function isActiveAdmin(User $user): bool
    {
        return $user->role === 'admin' && $user->status === 'active';
    }
}
