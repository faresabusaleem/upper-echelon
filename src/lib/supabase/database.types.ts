
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "achievements": {
                  Row: {
                    "code": string,"description": string,"family": string,"name": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"description": string,"family": string,"name": string,"position"?: number
                  }
                  Update: {
                    "code"?: string,"description"?: string,"family"?: string,"name"?: string,"position"?: number
                  }
                  Relationships: [
                    
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"id": number,"target_id": string | null,"target_type": string | null,"target_user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: never,"target_id"?: string | null,"target_type"?: string | null,"target_user_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: never,"target_id"?: string | null,"target_type"?: string | null,"target_user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_log_target_user_id_fkey"
      columns: ["target_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bookmarks": {
                  Row: {
                    "created_at": string,"thread_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"thread_id": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"thread_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookmarks_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "thread_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookmarks_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "threads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookmarks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversation_state": {
                  Row: {
                    "cleared_at": string | null,"conversation_id": string,"last_read_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cleared_at"?: string | null,"conversation_id": string,"last_read_at"?: string,"user_id": string
                  }
                  Update: {
                    "cleared_at"?: string | null,"conversation_id"?: string,"last_read_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversation_state_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversation_state_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "created_at": string,"id": string,"last_message_at": string,"user_a": string,"user_b": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"last_message_at"?: string,"user_a": string,"user_b": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"last_message_at"?: string,"user_a"?: string,"user_b"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_user_a_fkey"
      columns: ["user_a"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_user_b_fkey"
      columns: ["user_b"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"directory_tests": {
                  Row: {
                    "author": string,"ceiling": string | null,"cost": string | null,"created_at": string,"created_by": string | null,"difficulty": string,"duration": string | null,"format": string | null,"id": string,"is_free": boolean | null,"is_published": boolean,"item_count": number | null,"link_status": string,"measures": string,"name": string,"notes": string | null,"organisation": string | null,"position": number,"score_scale": string,"search": unknown,"slug": string,"supervised": boolean,"updated_at": string,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author": string,"ceiling"?: string | null,"cost"?: string | null,"created_at"?: string,"created_by"?: string | null,"difficulty"?: string,"duration"?: string | null,"format"?: string | null,"id"?: string,"is_free"?: boolean | null,"is_published"?: boolean,"item_count"?: number | null,"link_status"?: string,"measures": string,"name": string,"notes"?: string | null,"organisation"?: string | null,"position"?: number,"score_scale"?: string,"search"?: never,"slug": string,"supervised"?: boolean,"updated_at"?: string,"url": string
                  }
                  Update: {
                    "author"?: string,"ceiling"?: string | null,"cost"?: string | null,"created_at"?: string,"created_by"?: string | null,"difficulty"?: string,"duration"?: string | null,"format"?: string | null,"id"?: string,"is_free"?: boolean | null,"is_published"?: boolean,"item_count"?: number | null,"link_status"?: string,"measures"?: string,"name"?: string,"notes"?: string | null,"organisation"?: string | null,"position"?: number,"score_scale"?: string,"search"?: never,"slug"?: string,"supervised"?: boolean,"updated_at"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "directory_tests_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"drafts": {
                  Row: {
                    "body": string,"category_id": number | null,"id": string,"thread_id": number | null,"title": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"category_id"?: number | null,"id"?: string,"thread_id"?: number | null,"title"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"category_id"?: number | null,"id"?: string,"thread_id"?: number | null,"title"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "drafts_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "forum_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "drafts_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "thread_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "drafts_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "threads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "drafts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"email_outbox": {
                  Row: {
                    "attempts": number,"created_at": string,"id": number,"kind": string,"last_error": string | null,"payload": NonNullable<Json>,"sent_at": string | null,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"id"?: never,"kind": string,"last_error"?: string | null,"payload"?: NonNullable<Json>,"sent_at"?: string | null,"status"?: string,"user_id": string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"id"?: never,"kind"?: string,"last_error"?: string | null,"payload"?: NonNullable<Json>,"sent_at"?: string | null,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_outbox_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"error_logs": {
                  Row: {
                    "context": NonNullable<Json>,"created_at": string,"digest": string | null,"id": number,"level": string,"message": string,"stack": string | null,"url": string | null,"user_agent": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "context"?: NonNullable<Json>,"created_at"?: string,"digest"?: string | null,"id"?: never,"level"?: string,"message": string,"stack"?: string | null,"url"?: string | null,"user_agent"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "context"?: NonNullable<Json>,"created_at"?: string,"digest"?: string | null,"id"?: never,"level"?: string,"message"?: string,"stack"?: string | null,"url"?: string | null,"user_agent"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"follows": {
                  Row: {
                    "created_at": string,"followee_id": string,"follower_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"followee_id": string,"follower_id": string
                  }
                  Update: {
                    "created_at"?: string,"followee_id"?: string,"follower_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "follows_followee_id_fkey"
      columns: ["followee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_follower_id_fkey"
      columns: ["follower_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"forum_categories": {
                  Row: {
                    "created_at": string,"description": string,"id": number,"is_advice": boolean,"min_tier": number,"name": string,"position": number,"slug": string,"staff_only": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description": string,"id"?: number,"is_advice"?: boolean,"min_tier"?: number,"name": string,"position"?: number,"slug": string,"staff_only"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: number,"is_advice"?: boolean,"min_tier"?: number,"name"?: string,"position"?: number,"slug"?: string,"staff_only"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"game_bests": {
                  Row: {
                    "achieved_at": string,"best_rating": number,"best_score": number,"game": Database["public"]['Enums']["game_kind"],"personal_bests": number,"plays": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "achieved_at": string,"best_rating": number,"best_score": number,"game": Database["public"]['Enums']["game_kind"],"personal_bests"?: number,"plays"?: number,"user_id": string
                  }
                  Update: {
                    "achieved_at"?: string,"best_rating"?: number,"best_score"?: number,"game"?: Database["public"]['Enums']["game_kind"],"personal_bests"?: number,"plays"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_bests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_results": {
                  Row: {
                    "created_at": string,"details": NonNullable<Json>,"flag_reason": string | null,"game": Database["public"]['Enums']["game_kind"],"id": number,"is_daily": boolean,"is_flagged": boolean,"rating": number,"score": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: NonNullable<Json>,"flag_reason"?: string | null,"game": Database["public"]['Enums']["game_kind"],"id"?: never,"is_daily"?: boolean,"is_flagged"?: boolean,"rating": number,"score": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: NonNullable<Json>,"flag_reason"?: string | null,"game"?: Database["public"]['Enums']["game_kind"],"id"?: never,"is_daily"?: boolean,"is_flagged"?: boolean,"rating"?: number,"score"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_results_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_sessions": {
                  Row: {
                    "consumed_at": string | null,"game": Database["public"]['Enums']["game_kind"],"id": string,"started_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "consumed_at"?: string | null,"game": Database["public"]['Enums']["game_kind"],"id"?: string,"started_at"?: string,"user_id": string
                  }
                  Update: {
                    "consumed_at"?: string | null,"game"?: Database["public"]['Enums']["game_kind"],"id"?: string,"started_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"member_achievements": {
                  Row: {
                    "code": string,"earned_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"earned_at"?: string,"user_id": string
                  }
                  Update: {
                    "code"?: string,"earned_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_achievements_code_fkey"
      columns: ["code"]
isOneToOne: false
      referencedRelation: "achievements"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "member_achievements_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"member_days": {
                  Row: {
                    "daily_done": boolean,"day": string,"games": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "daily_done"?: boolean,"day": string,"games"?: number,"user_id": string
                  }
                  Update: {
                    "daily_done"?: boolean,"day"?: string,"games"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_days_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"conversation_id": string,"created_at": string,"id": number,"removed_at": string | null,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"conversation_id": string,"created_at"?: string,"id"?: never,"removed_at"?: string | null,"sender_id": string
                  }
                  Update: {
                    "body"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: never,"removed_at"?: string | null,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"mutes": {
                  Row: {
                    "created_at": string,"muted_id": string,"muter_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"muted_id": string,"muter_id": string
                  }
                  Update: {
                    "created_at"?: string,"muted_id"?: string,"muter_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mutes_muted_id_fkey"
      columns: ["muted_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mutes_muter_id_fkey"
      columns: ["muter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"data": NonNullable<Json>,"id": number,"kind": string,"post_id": number | null,"read_at": string | null,"thread_id": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: never,"kind": string,"post_id"?: number | null,"read_at"?: string | null,"thread_id"?: number | null,"user_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: never,"kind"?: string,"post_id"?: number | null,"read_at"?: string | null,"thread_id"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "thread_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "threads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"poll_votes": {
                  Row: {
                    "created_at": string,"option_index": number,"poll_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"option_index": number,"poll_id": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"option_index"?: number,"poll_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "poll_votes_poll_id_fkey"
      columns: ["poll_id"]
isOneToOne: false
      referencedRelation: "polls"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "poll_votes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"polls": {
                  Row: {
                    "allow_multiple": boolean,"closes_at": string | null,"created_at": string,"id": number,"options": (string)[],"question": string,"thread_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_multiple"?: boolean,"closes_at"?: string | null,"created_at"?: string,"id"?: never,"options": (string)[],"question": string,"thread_id": number
                  }
                  Update: {
                    "allow_multiple"?: boolean,"closes_at"?: string | null,"created_at"?: string,"id"?: never,"options"?: (string)[],"question"?: string,"thread_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "polls_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: true
      referencedRelation: "thread_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "polls_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: true
      referencedRelation: "threads"
      referencedColumns: ["id"]
    }
                  ]
                },"post_votes": {
                  Row: {
                    "created_at": string,"post_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_votes_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_votes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "author_id": string | null,"body": string,"created_at": string,"edited_at": string | null,"id": number,"removed_at": string | null,"removed_by": string | null,"removed_reason": string | null,"score": number,"search": unknown,"thread_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body": string,"created_at"?: string,"edited_at"?: string | null,"id"?: never,"removed_at"?: string | null,"removed_by"?: string | null,"removed_reason"?: string | null,"score"?: number,"search"?: never,"thread_id": number
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"edited_at"?: string | null,"id"?: never,"removed_at"?: string | null,"removed_by"?: string | null,"removed_reason"?: string | null,"score"?: number,"search"?: never,"thread_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_removed_by_fkey"
      columns: ["removed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "thread_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "threads"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_private": {
                  Row: {
                    "created_at": string,"date_of_birth": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"date_of_birth"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"date_of_birth"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_private_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"banner_url": string | null,"bio": string | null,"created_at": string,"display_name": string,"echelon_score": number,"id": string,"interests": (string)[],"is_staff": boolean,"links": NonNullable<Json>,"location": string | null,"mind_score": number,"onboarded_at": string | null,"practice_score": number,"pronouns": string | null,"reputation": number,"role": Database["public"]['Enums']["member_role"],"showcase_badges": (string)[],"showcase_games": (Database["public"]['Enums']["game_kind"])[],"theme": string,"tier": number,"updated_at": string,"username": string,"voice_score": number
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"banner_url"?: string | null,"bio"?: string | null,"created_at"?: string,"display_name": string,"echelon_score"?: number,"id": string,"interests"?: (string)[],"is_staff"?: boolean,"links"?: NonNullable<Json>,"location"?: string | null,"mind_score"?: number,"onboarded_at"?: string | null,"practice_score"?: number,"pronouns"?: string | null,"reputation"?: number,"role"?: Database["public"]['Enums']["member_role"],"showcase_badges"?: (string)[],"showcase_games"?: (Database["public"]['Enums']["game_kind"])[],"theme"?: string,"tier"?: number,"updated_at"?: string,"username": string,"voice_score"?: number
                  }
                  Update: {
                    "avatar_url"?: string | null,"banner_url"?: string | null,"bio"?: string | null,"created_at"?: string,"display_name"?: string,"echelon_score"?: number,"id"?: string,"interests"?: (string)[],"is_staff"?: boolean,"links"?: NonNullable<Json>,"location"?: string | null,"mind_score"?: number,"onboarded_at"?: string | null,"practice_score"?: number,"pronouns"?: string | null,"reputation"?: number,"role"?: Database["public"]['Enums']["member_role"],"showcase_badges"?: (string)[],"showcase_games"?: (Database["public"]['Enums']["game_kind"])[],"theme"?: string,"tier"?: number,"updated_at"?: string,"username"?: string,"voice_score"?: number
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"details": string | null,"id": number,"reason": string,"reporter_id": string | null,"resolution_note": string | null,"resolved_at": string | null,"resolved_by": string | null,"snapshot": NonNullable<Json>,"status": string,"target_id": string,"target_type": Database["public"]['Enums']["report_target"],"target_user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"id"?: never,"reason": string,"reporter_id"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"snapshot"?: NonNullable<Json>,"status"?: string,"target_id": string,"target_type": Database["public"]['Enums']["report_target"],"target_user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"id"?: never,"reason"?: string,"reporter_id"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"snapshot"?: NonNullable<Json>,"status"?: string,"target_id"?: string,"target_type"?: Database["public"]['Enums']["report_target"],"target_user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_target_user_id_fkey"
      columns: ["target_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"revisions": {
                  Row: {
                    "body": string,"created_at": string,"edited_by": string | null,"id": number,"post_id": number | null,"thread_id": number | null,"title": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"edited_by"?: string | null,"id"?: never,"post_id"?: number | null,"thread_id"?: number | null,"title"?: string | null
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"edited_by"?: string | null,"id"?: never,"post_id"?: number | null,"thread_id"?: number | null,"title"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "revisions_edited_by_fkey"
      columns: ["edited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "revisions_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "revisions_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "thread_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "revisions_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "threads"
      referencedColumns: ["id"]
    }
                  ]
                },"sanctions": {
                  Row: {
                    "created_at": string,"expires_at": string | null,"id": number,"issued_by": string | null,"kind": string,"reason": string,"revoked_at": string | null,"revoked_by": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at"?: string | null,"id"?: never,"issued_by"?: string | null,"kind": string,"reason": string,"revoked_at"?: string | null,"revoked_by"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string | null,"id"?: never,"issued_by"?: string | null,"kind"?: string,"reason"?: string,"revoked_at"?: string | null,"revoked_by"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sanctions_issued_by_fkey"
      columns: ["issued_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sanctions_revoked_by_fkey"
      columns: ["revoked_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sanctions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"test_results": {
                  Row: {
                    "created_at": string,"id": string,"is_hidden": boolean,"note": string | null,"proof_path": string | null,"scale": string,"score": number,"taken_on": string | null,"test_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_hidden"?: boolean,"note"?: string | null,"proof_path"?: string | null,"scale": string,"score": number,"taken_on"?: string | null,"test_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_hidden"?: boolean,"note"?: string | null,"proof_path"?: string | null,"scale"?: string,"score"?: number,"taken_on"?: string | null,"test_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "test_results_test_id_fkey"
      columns: ["test_id"]
isOneToOne: false
      referencedRelation: "directory_tests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "test_results_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"thread_subscriptions": {
                  Row: {
                    "created_at": string,"thread_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"thread_id": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"thread_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "thread_subscriptions_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "thread_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "thread_subscriptions_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "threads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "thread_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"thread_votes": {
                  Row: {
                    "created_at": string,"thread_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"thread_id": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"thread_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "thread_votes_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "thread_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "thread_votes_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "threads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "thread_votes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"threads": {
                  Row: {
                    "author_id": string | null,"body": string,"category_id": number,"created_at": string,"directory_test_id": string | null,"edited_at": string | null,"id": number,"is_locked": boolean,"is_official": boolean,"is_pinned": boolean,"last_activity_at": string,"last_reply_by": string | null,"removed_at": string | null,"removed_by": string | null,"removed_reason": string | null,"reply_count": number,"score": number,"search": unknown,"solved_post_id": number | null,"tags": (string)[],"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body": string,"category_id": number,"created_at"?: string,"directory_test_id"?: string | null,"edited_at"?: string | null,"id"?: never,"is_locked"?: boolean,"is_official"?: boolean,"is_pinned"?: boolean,"last_activity_at"?: string,"last_reply_by"?: string | null,"removed_at"?: string | null,"removed_by"?: string | null,"removed_reason"?: string | null,"reply_count"?: number,"score"?: number,"search"?: never,"solved_post_id"?: number | null,"tags"?: (string)[],"title": string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"category_id"?: number,"created_at"?: string,"directory_test_id"?: string | null,"edited_at"?: string | null,"id"?: never,"is_locked"?: boolean,"is_official"?: boolean,"is_pinned"?: boolean,"last_activity_at"?: string,"last_reply_by"?: string | null,"removed_at"?: string | null,"removed_by"?: string | null,"removed_reason"?: string | null,"reply_count"?: number,"score"?: number,"search"?: never,"solved_post_id"?: number | null,"tags"?: (string)[],"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "threads_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "threads_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "forum_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "threads_directory_test_id_fkey"
      columns: ["directory_test_id"]
isOneToOne: false
      referencedRelation: "directory_tests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "threads_last_reply_by_fkey"
      columns: ["last_reply_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "threads_removed_by_fkey"
      columns: ["removed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "threads_solved_fk"
      columns: ["solved_post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"tier_events": {
                  Row: {
                    "created_at": string,"id": number,"tier": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"tier": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"tier"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tier_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"uploads": {
                  Row: {
                    "bucket": string,"bytes": number | null,"created_at": string,"height": number | null,"id": string,"path": string,"removed_at": string | null,"user_id": string | null,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"bytes"?: number | null,"created_at"?: string,"height"?: number | null,"id"?: string,"path": string,"removed_at"?: string | null,"user_id"?: string | null,"width"?: number | null
                  }
                  Update: {
                    "bucket"?: string,"bytes"?: number | null,"created_at"?: string,"height"?: number | null,"id"?: string,"path"?: string,"removed_at"?: string | null,"user_id"?: string | null,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "uploads_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_settings": {
                  Row: {
                    "activity_visibility": Database["public"]['Enums']["visibility"],"dm_policy": Database["public"]['Enums']["dm_policy"],"followers_visibility": Database["public"]['Enums']["visibility"],"game_stats_visibility": Database["public"]['Enums']["visibility"],"grain": boolean,"high_contrast": boolean,"notify_email": NonNullable<Json>,"notify_inapp": NonNullable<Json>,"reduced_motion": boolean,"test_results_visibility": Database["public"]['Enums']["visibility"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_visibility"?: Database["public"]['Enums']["visibility"],"dm_policy"?: Database["public"]['Enums']["dm_policy"],"followers_visibility"?: Database["public"]['Enums']["visibility"],"game_stats_visibility"?: Database["public"]['Enums']["visibility"],"grain"?: boolean,"high_contrast"?: boolean,"notify_email"?: NonNullable<Json>,"notify_inapp"?: NonNullable<Json>,"reduced_motion"?: boolean,"test_results_visibility"?: Database["public"]['Enums']["visibility"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activity_visibility"?: Database["public"]['Enums']["visibility"],"dm_policy"?: Database["public"]['Enums']["dm_policy"],"followers_visibility"?: Database["public"]['Enums']["visibility"],"game_stats_visibility"?: Database["public"]['Enums']["visibility"],"grain"?: boolean,"high_contrast"?: boolean,"notify_email"?: NonNullable<Json>,"notify_inapp"?: NonNullable<Json>,"reduced_motion"?: boolean,"test_results_visibility"?: Database["public"]['Enums']["visibility"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_settings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "thread_list": {
                  Row: {
                    "author_avatar": string | null,"author_id": string | null,"author_name": string | null,"author_tier": number | null,"author_username": string | null,"category_id": number,"category_min_tier": number,"category_name": string,"category_slug": string,"created_at": string,"directory_test_id": string | null,"has_poll": boolean | null,"id": number,"is_locked": boolean,"is_official": boolean,"is_pinned": boolean,"last_activity_at": string,"last_reply_name": string | null,"last_reply_username": string | null,"removed_at": string | null,"reply_count": number,"score": number,"solved_post_id": number | null,"tags": (string)[],"title": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "threads_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "threads_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "forum_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "threads_directory_test_id_fkey"
      columns: ["directory_test_id"]
isOneToOne: false
      referencedRelation: "directory_tests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "threads_solved_fk"
      columns: ["solved_post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "admin_set_role":
{ Args: { "p_role": Database["public"]['Enums']["member_role"],"p_user": string }; Returns: undefined
                           },
"award":
{ Args: { "p_code": string,"uid": string }; Returns: undefined
                           },
"can_message":
{ Args: { "recipient": string,"sender": string }; Returns: boolean
                           },
"can_see":
{ Args: { "item": string,"owner": string }; Returns: boolean
                           },
"can_view_category":
{ Args: { "cat": number }; Returns: boolean
                           },
"can_view_thread":
{ Args: { "tid": number }; Returns: boolean
                           },
"can_view_thread_for":
{ Args: { "tid": number,"uid": string }; Returns: boolean
                           },
"can_write":
{ Args: { "uid"?: string }; Returns: boolean
                           },
"category_overview":
{ Args: Record<PropertyKey, never>; Returns: {
              "category_id": number,"last_activity_at": string,"replies": number,"threads": number
            }[]
                           },
"complete_initiation":
{ Args: { "p_date_of_birth": string,"p_display_name": string,"p_interests": (string)[],"p_username": string }; Returns: undefined
                           },
"current_streak":
{ Args: { "uid": string }; Returns: number
                           },
"daily_game":
{ Args: { "d"?: string }; Returns: Database["public"]['Enums']["game_kind"]
                           },
"daily_maintenance":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"enforce_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: undefined
                           },
"extract_mentions":
{ Args: { "txt": string }; Returns: (string)[]
                           },
"follow_counts":
{ Args: { "uid": string }; Returns: {
              "followers": number,"following": number
            }[]
                           },
"game_distribution":
{ Args: { "buckets"?: number,"g": Database["public"]['Enums']["game_kind"],"hi": number,"lo": number }; Returns: {
              "bucket": number,"members": number
            }[]
                           },
"game_lower_is_better":
{ Args: { "g": Database["public"]['Enums']["game_kind"] }; Returns: boolean
                           },
"game_percentile":
{ Args: { "g": Database["public"]['Enums']["game_kind"],"s": number }; Returns: number
                           },
"game_population":
{ Args: { "g": Database["public"]['Enums']["game_kind"] }; Returns: number
                           },
"has_active_sanction":
{ Args: { "p_kind": string,"uid": string }; Returns: boolean
                           },
"hit_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"is_admin":
{ Args: { "uid"?: string }; Returns: boolean
                           },
"is_blocked_between":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"is_following":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"is_moderator":
{ Args: { "uid"?: string }; Returns: boolean
                           },
"is_participant":
{ Args: { "cid": string,"uid"?: string }; Returns: boolean
                           },
"leaderboard":
{ Args: { "g": Database["public"]['Enums']["game_kind"],"lim"?: number,"period"?: string,"tier_filter"?: number }; Returns: {
              "achieved_at": string,"avatar_url": string,"display_name": string,"rank": number,"score": number,"tier": number,"user_id": string,"username": string
            }[]
                           },
"log_action":
{ Args: { "p_action": string,"p_details": Json,"p_id": string,"p_type": string,"p_user": string }; Returns: undefined
                           },
"longest_streak":
{ Args: { "uid": string }; Returns: number
                           },
"mark_solution":
{ Args: { "p_post": number,"p_thread": number }; Returns: undefined
                           },
"member_activity":
{ Args: { "lim"?: number,"uid": string }; Returns: {
              "created_at": string,"detail": string,"kind": string,"ref": string,"title": string
            }[]
                           },
"member_tier":
{ Args: { "uid"?: string }; Returns: number
                           },
"mod_member_overview":
{ Args: { "p_user": string }; Returns: Json
                           },
"mod_move_thread":
{ Args: { "p_category": number,"p_thread": number }; Returns: undefined
                           },
"mod_resolve_report":
{ Args: { "p_note"?: string,"p_report": number,"p_status": string }; Returns: undefined
                           },
"mod_revoke_sanction":
{ Args: { "p_sanction": number }; Returns: undefined
                           },
"mod_sanction":
{ Args: { "p_hours"?: number,"p_kind": string,"p_reason": string,"p_user": string }; Returns: number
                           },
"mod_set_removed":
{ Args: { "p_id": string,"p_reason"?: string,"p_removed": boolean,"p_type": string }; Returns: undefined
                           },
"mod_set_thread_flags":
{ Args: { "p_locked": boolean,"p_pinned": boolean,"p_thread": number }; Returns: undefined
                           },
"normalise_tags":
{ Args: { "t": (string)[] }; Returns: (string)[]
                           },
"notify":
{ Args: { "actor": string,"p_data"?: Json,"p_kind": string,"p_post": number,"p_thread": number,"recipient": string }; Returns: undefined
                           },
"poll_results":
{ Args: { "p_poll": number }; Returns: {
              "option_index": number,"votes": number
            }[]
                           },
"popular_tags":
{ Args: { "lim"?: number }; Returns: {
              "tag": string,"threads": number
            }[]
                           },
"prepare_account_deletion":
{ Args: { "uid": string }; Returns: undefined
                           },
"recompute_member":
{ Args: { "uid": string }; Returns: undefined
                           },
"require_moderator":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"search_forum":
{ Args: { "lim"?: number,"off"?: number,"q": string }; Returns: {
              "category_slug": string,"created_at": string,"post_id": number,"rank": number,"snippet": string,"thread_id": number,"title": string
            }[]
                           },
"start_conversation":
{ Args: { "other": string }; Returns: string
                           },
"tags_text":
{ Args: { "t": (string)[] }; Returns: string
                           },
"tier_for_score":
{ Args: { "score": number }; Returns: number
                           },
"tier_name":
{ Args: { "t": number }; Returns: string
                           },
"unread_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "messages": number,"notifications": number
            }[]
                           },
"username_available":
{ Args: { "p_username": string }; Returns: boolean
                           }
          }
          Enums: {
            "dm_policy": "everyone"|"following"|"no_one","game_kind": "reaction"|"sequence"|"aim"|"number"|"verbal"|"chimp"|"visual"|"typing","member_role": "member"|"moderator"|"admin","report_target": "thread"|"post"|"profile"|"message"|"image"|"test_result","visibility": "everyone"|"followers"|"only_me"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "dm_policy": ["everyone", "following", "no_one"],"game_kind": ["reaction", "sequence", "aim", "number", "verbal", "chimp", "visual", "typing"],"member_role": ["member", "moderator", "admin"],"report_target": ["thread", "post", "profile", "message", "image", "test_result"],"visibility": ["everyone", "followers", "only_me"]
          }
        }
} as const
