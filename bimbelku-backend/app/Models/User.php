<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

use App\Models\TeacherSubject;
use App\Models\TeacherProfile;
use App\Models\TeacherAvailability;
use App\Models\Classroom;
use App\Models\Rating;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password', 
        'profile_cover',
        'password_updated_at',
        'role', 
        'status', 
        'school_name', 
        'student_education_level',
        'grade',
        'learning_needs',
        'date_of_birth',
        'guardian_name',
        'guardian_phone',
        'guardian_relationship',
        'guardian_consent_at',
        // [BARU] Tambahan kolom alamat
        'address',
        'maps_link',
        'latitude',
        'longitude',
        'location_consent_at',
        'terms_accepted_at',
        'privacy_accepted_at',
        'policy_version',
        'consent_ip',
        'consent_user_agent',
        'teacher_rejection_streak',
        'last_teacher_rejection_at',
        'search_cooldown_until',
        'finance_totp_secret',
        'finance_totp_confirmed_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'phone',
        'address',
        'maps_link',
        'latitude',
        'longitude',
        'date_of_birth',
        'guardian_name',
        'guardian_phone',
        'guardian_relationship',
        'guardian_consent_at',
        'consent_ip',
        'consent_user_agent',
        'finance_totp_secret',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'password_updated_at' => 'datetime',
        'terms_accepted_at' => 'datetime',
        'privacy_accepted_at' => 'datetime',
        'date_of_birth' => 'date',
        'guardian_consent_at' => 'datetime',
        'location_consent_at' => 'datetime',
        'last_teacher_rejection_at' => 'datetime',
        'search_cooldown_until' => 'datetime',
        'teacher_rejection_streak' => 'integer',
        'finance_totp_secret' => 'encrypted',
        'finance_totp_confirmed_at' => 'datetime',
    ];

    // Relasi ke Profil Guru
    public function teacherProfile()
    {
        return $this->hasOne(TeacherProfile::class);
    }

    // Relasi ke Kelas yang dibuat (sebagai Guru)
    public function classrooms()
    {
        return $this->hasMany(Classroom::class, 'user_id');
    }

    // Relasi Murid ke Kelas (Many-to-Many)
    public function enrolledClasses()
    {
        return $this->belongsToMany(Classroom::class, 'class_students', 'student_id', 'classroom_id')
                    ->withPivot('joined_at');
    }

    // Relasi Ketersediaan Jadwal
    public function availabilities()
    {
        return $this->hasMany(TeacherAvailability::class, 'user_id');
    }

    // Relasi Mapel (Lewat Profile)
    public function subjects()
    {
        return $this->hasManyThrough(
            TeacherSubject::class,   
            TeacherProfile::class,   
            'user_id',               
            'teacher_profile_id',    
            'id',                    
            'id'                     
        );
    }

    public function bookingRequests()
    {
        return $this->hasMany(BookingRequest::class, 'student_id');
    }

    public function teacherOffers()
    {
        return $this->hasMany(TeacherOffer::class, 'teacher_id');
    }

    public function teacherBookings()
    {
        return $this->hasMany(Booking::class, 'teacher_id');
    }

    public function studentBookings()
    {
        return $this->hasMany(Booking::class, 'student_id');
    }

    public function bookingParticipations()
    {
        return $this->hasMany(BookingParticipant::class, 'student_id');
    }

    public function learningPackages()
    {
        return $this->hasMany(LearningPackage::class, 'student_id');
    }

    public function promotionClaims()
    {
        return $this->hasMany(PromotionClaim::class);
    }

    // Relasi Rating
    public function ratings()
    {
        return $this->hasMany(Rating::class, 'teacher_id');
    }
}
