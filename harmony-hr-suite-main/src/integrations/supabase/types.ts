export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          priority: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          title?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string | null
          check_in_accuracy: number | null
          check_in_latitude: number | null
          check_in_location: string | null
          check_in_longitude: number | null
          check_out: string | null
          check_out_accuracy: number | null
          check_out_latitude: number | null
          check_out_location: string | null
          check_out_longitude: number | null
          created_at: string
          date: string
          device_info: string | null
          employee_id: string
          geofence_id: string | null
          id: string
          is_within_geofence: boolean | null
          notes: string | null
          status: string | null
          work_hours: number | null
        }
        Insert: {
          check_in?: string | null
          check_in_accuracy?: number | null
          check_in_latitude?: number | null
          check_in_location?: string | null
          check_in_longitude?: number | null
          check_out?: string | null
          check_out_accuracy?: number | null
          check_out_latitude?: number | null
          check_out_location?: string | null
          check_out_longitude?: number | null
          created_at?: string
          date?: string
          device_info?: string | null
          employee_id: string
          geofence_id?: string | null
          id?: string
          is_within_geofence?: boolean | null
          notes?: string | null
          status?: string | null
          work_hours?: number | null
        }
        Update: {
          check_in?: string | null
          check_in_accuracy?: number | null
          check_in_latitude?: number | null
          check_in_location?: string | null
          check_in_longitude?: number | null
          check_out?: string | null
          check_out_accuracy?: number | null
          check_out_latitude?: number | null
          check_out_location?: string | null
          check_out_longitude?: number | null
          created_at?: string
          date?: string
          device_info?: string | null
          employee_id?: string
          geofence_id?: string | null
          id?: string
          is_within_geofence?: boolean | null
          notes?: string | null
          status?: string | null
          work_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_corrections: {
        Row: {
          attendance_id: string | null
          correction_type: string
          created_at: string
          employee_id: string
          id: string
          reason: string
          rejection_reason: string | null
          requested_check_in: string | null
          requested_check_out: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          attendance_id?: string | null
          correction_type: string
          created_at?: string
          employee_id: string
          id?: string
          reason: string
          rejection_reason?: string | null
          requested_check_in?: string | null
          requested_check_out?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          attendance_id?: string | null
          correction_type?: string
          created_at?: string
          employee_id?: string
          id?: string
          reason?: string
          rejection_reason?: string | null
          requested_check_in?: string | null
          requested_check_out?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_corrections_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_documents: {
        Row: {
          created_at: string
          document_category: string
          document_name: string
          document_type: string
          employee_id: string
          file_size: number | null
          file_url: string | null
          id: string
          mime_type: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_category?: string
          document_name: string
          document_type: string
          employee_id: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_category?: string
          document_name?: string
          document_type?: string
          employee_id?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_health_insurance: {
        Row: {
          coverage_type: string
          created_at: string
          dependents_count: number | null
          employee_contribution: number
          employee_id: string
          employer_contribution: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          monthly_premium: number
          plan_name: string
          provider: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          coverage_type: string
          created_at?: string
          dependents_count?: number | null
          employee_contribution: number
          employee_id: string
          employer_contribution?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          monthly_premium: number
          plan_name: string
          provider?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          coverage_type?: string
          created_at?: string
          dependents_count?: number | null
          employee_contribution?: number
          employee_id?: string
          employer_contribution?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          monthly_premium?: number
          plan_name?: string
          provider?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_health_insurance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_loans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_installments: number | null
          created_at: string
          employee_id: string
          end_date: string | null
          id: string
          interest_rate: number | null
          loan_amount: number
          loan_type: string
          monthly_deduction: number
          notes: string | null
          remaining_amount: number
          start_date: string
          status: string | null
          total_installments: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_installments?: number | null
          created_at?: string
          employee_id: string
          end_date?: string | null
          id?: string
          interest_rate?: number | null
          loan_amount: number
          loan_type: string
          monthly_deduction: number
          notes?: string | null
          remaining_amount: number
          start_date: string
          status?: string | null
          total_installments: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_installments?: number | null
          created_at?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          interest_rate?: number | null
          loan_amount?: number
          loan_type?: string
          monthly_deduction?: number
          notes?: string | null
          remaining_amount?: number
          start_date?: string
          status?: string | null
          total_installments?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salary_structures: {
        Row: {
          amount: number
          component_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          is_active: boolean | null
          percentage: number | null
          updated_at: string
        }
        Insert: {
          amount?: number
          component_id: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id: string
          id?: string
          is_active?: boolean | null
          percentage?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          component_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          is_active?: boolean | null
          percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_structures_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "salary_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_structures_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          department_id: string | null
          designation: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_code: string
          employment_type: string | null
          full_name: string
          gender: string | null
          id: string
          joining_date: string
          phone: string | null
          postal_code: string | null
          reporting_manager_id: string | null
          salary: number | null
          state: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          designation?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code: string
          employment_type?: string | null
          full_name: string
          gender?: string | null
          id?: string
          joining_date?: string
          phone?: string | null
          postal_code?: string | null
          reporting_manager_id?: string | null
          salary?: number | null
          state?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          designation?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code?: string
          employment_type?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          joining_date?: string
          phone?: string | null
          postal_code?: string | null
          reporting_manager_id?: string | null
          salary?: number | null
          state?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      geofences: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          latitude: number
          longitude: number
          name: string
          radius_meters: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          latitude: number
          longitude: number
          name: string
          radius_meters?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          latitude?: number
          longitude?: number
          name?: string
          radius_meters?: number
          updated_at?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          date: string
          description: string | null
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          name: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          name: string
          updated_at?: string
          year?: number
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          name?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          carried_over_days: number
          created_at: string
          employee_id: string
          id: string
          leave_type_id: string
          pending_days: number
          total_days: number
          updated_at: string
          used_days: number
          year: number
        }
        Insert: {
          carried_over_days?: number
          created_at?: string
          employee_id: string
          id?: string
          leave_type_id: string
          pending_days?: number
          total_days?: number
          updated_at?: string
          used_days?: number
          year?: number
        }
        Update: {
          carried_over_days?: number
          created_at?: string
          employee_id?: string
          id?: string
          leave_type_id?: string
          pending_days?: number
          total_days?: number
          updated_at?: string
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          document_url: string | null
          employee_id: string
          end_date: string
          half_day: boolean | null
          half_day_type: string | null
          id: string
          leave_type_id: string | null
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: string | null
          total_days: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          document_url?: string | null
          employee_id: string
          end_date: string
          half_day?: boolean | null
          half_day_type?: string | null
          id?: string
          leave_type_id?: string | null
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: string | null
          total_days?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          document_url?: string | null
          employee_id?: string
          end_date?: string
          half_day?: boolean | null
          half_day_type?: string | null
          id?: string
          leave_type_id?: string | null
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: string | null
          total_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          allows_carryover: boolean | null
          created_at: string
          days_per_year: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_paid: boolean | null
          max_carryover_days: number | null
          max_consecutive_days: number | null
          min_days_notice: number | null
          name: string
          requires_document: boolean | null
        }
        Insert: {
          allows_carryover?: boolean | null
          created_at?: string
          days_per_year?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          max_carryover_days?: number | null
          max_consecutive_days?: number | null
          min_days_notice?: number | null
          name: string
          requires_document?: boolean | null
        }
        Update: {
          allows_carryover?: boolean | null
          created_at?: string
          days_per_year?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          max_carryover_days?: number | null
          max_consecutive_days?: number | null
          min_days_notice?: number | null
          name?: string
          requires_document?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payroll_audit_logs: {
        Row: {
          action_description: string
          action_type: string
          amount: number | null
          created_at: string
          employee_id: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          performed_by: string | null
          period_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_description: string
          action_type: string
          amount?: number | null
          created_at?: string
          employee_id?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          period_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_description?: string
          action_type?: string
          amount?: number | null
          created_at?: string
          employee_id?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          period_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_audit_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_audit_logs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          created_at: string
          end_date: string
          id: string
          month: number
          name: string
          start_date: string
          status: string | null
          updated_at: string
          working_days: number | null
          year: number
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          month: number
          name: string
          start_date: string
          status?: string | null
          updated_at?: string
          working_days?: number | null
          year: number
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          month?: number
          name?: string
          start_date?: string
          status?: string | null
          updated_at?: string
          working_days?: number | null
          year?: number
        }
        Relationships: []
      }
      payroll_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_count: number | null
          id: string
          notes: string | null
          period_id: string
          run_by: string | null
          run_date: string
          status: string | null
          total_deductions: number | null
          total_gross: number | null
          total_net: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_count?: number | null
          id?: string
          notes?: string | null
          period_id: string
          run_by?: string | null
          run_date?: string
          status?: string | null
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_count?: number | null
          id?: string
          notes?: string | null
          period_id?: string
          run_by?: string | null
          run_date?: string
          status?: string | null
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payslip_items: {
        Row: {
          amount: number
          component_id: string | null
          component_name: string
          component_type: Database["public"]["Enums"]["salary_component_type"]
          created_at: string
          id: string
          is_taxable: boolean | null
          notes: string | null
          payslip_id: string
        }
        Insert: {
          amount: number
          component_id?: string | null
          component_name: string
          component_type: Database["public"]["Enums"]["salary_component_type"]
          created_at?: string
          id?: string
          is_taxable?: boolean | null
          notes?: string | null
          payslip_id: string
        }
        Update: {
          amount?: number
          component_id?: string | null
          component_name?: string
          component_type?: Database["public"]["Enums"]["salary_component_type"]
          created_at?: string
          id?: string
          is_taxable?: boolean | null
          notes?: string | null
          payslip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslip_items_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "salary_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslip_items_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          advance_deduction: number | null
          basic_salary: number
          bonus_amount: number | null
          created_at: string
          days_worked: number | null
          employee_id: string
          eobi_amount: number | null
          gross_earnings: number
          health_insurance_deduction: number | null
          id: string
          late_deduction: number | null
          leave_deduction: number | null
          leaves_taken: number | null
          loan_deduction: number | null
          net_salary: number
          other_deductions: number | null
          overtime_amount: number | null
          overtime_hours: number | null
          payment_date: string | null
          payment_reference: string | null
          payroll_run_id: string
          period_id: string
          provident_fund: number | null
          social_security_deduction: number | null
          status: string | null
          tax_amount: number | null
          total_allowances: number | null
          total_deductions: number | null
          unpaid_leaves: number | null
          updated_at: string
          working_days: number | null
        }
        Insert: {
          advance_deduction?: number | null
          basic_salary?: number
          bonus_amount?: number | null
          created_at?: string
          days_worked?: number | null
          employee_id: string
          eobi_amount?: number | null
          gross_earnings?: number
          health_insurance_deduction?: number | null
          id?: string
          late_deduction?: number | null
          leave_deduction?: number | null
          leaves_taken?: number | null
          loan_deduction?: number | null
          net_salary?: number
          other_deductions?: number | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          payment_date?: string | null
          payment_reference?: string | null
          payroll_run_id: string
          period_id: string
          provident_fund?: number | null
          social_security_deduction?: number | null
          status?: string | null
          tax_amount?: number | null
          total_allowances?: number | null
          total_deductions?: number | null
          unpaid_leaves?: number | null
          updated_at?: string
          working_days?: number | null
        }
        Update: {
          advance_deduction?: number | null
          basic_salary?: number
          bonus_amount?: number | null
          created_at?: string
          days_worked?: number | null
          employee_id?: string
          eobi_amount?: number | null
          gross_earnings?: number
          health_insurance_deduction?: number | null
          id?: string
          late_deduction?: number | null
          leave_deduction?: number | null
          leaves_taken?: number | null
          loan_deduction?: number | null
          net_salary?: number
          other_deductions?: number | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          payment_date?: string | null
          payment_reference?: string | null
          payroll_run_id?: string
          period_id?: string
          provident_fund?: number | null
          social_security_deduction?: number | null
          status?: string | null
          tax_amount?: number | null
          total_allowances?: number | null
          total_deductions?: number | null
          unpaid_leaves?: number | null
          updated_at?: string
          working_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reimbursements: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          description: string
          employee_id: string
          expense_date: string
          id: string
          processed_in_payroll: string | null
          receipt_url: string | null
          rejection_reason: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string
          description: string
          employee_id: string
          expense_date: string
          id?: string
          processed_in_payroll?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          description?: string
          employee_id?: string
          expense_date?: string
          id?: string
          processed_in_payroll?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reimbursements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimbursements_processed_in_payroll_fkey"
            columns: ["processed_in_payroll"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_advances: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          disbursement_date: string | null
          employee_id: string
          id: string
          installments: number | null
          reason: string | null
          recovered_amount: number | null
          recovery_start_period: string | null
          rejection_reason: string | null
          request_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          disbursement_date?: string | null
          employee_id: string
          id?: string
          installments?: number | null
          reason?: string | null
          recovered_amount?: number | null
          recovery_start_period?: string | null
          rejection_reason?: string | null
          request_date?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          disbursement_date?: string | null
          employee_id?: string
          id?: string
          installments?: number | null
          reason?: string | null
          recovered_amount?: number | null
          recovery_start_period?: string | null
          rejection_reason?: string | null
          request_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_advances_recovery_start_period_fkey"
            columns: ["recovery_start_period"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_components: {
        Row: {
          calculation_base: string | null
          calculation_type: string | null
          code: string
          created_at: string
          default_value: number | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_fixed: boolean | null
          is_statutory: boolean | null
          is_taxable: boolean | null
          name: string
          type: Database["public"]["Enums"]["salary_component_type"]
          updated_at: string
        }
        Insert: {
          calculation_base?: string | null
          calculation_type?: string | null
          code: string
          created_at?: string
          default_value?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_fixed?: boolean | null
          is_statutory?: boolean | null
          is_taxable?: boolean | null
          name: string
          type: Database["public"]["Enums"]["salary_component_type"]
          updated_at?: string
        }
        Update: {
          calculation_base?: string | null
          calculation_type?: string | null
          code?: string
          created_at?: string
          default_value?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_fixed?: boolean | null
          is_statutory?: boolean | null
          is_taxable?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["salary_component_type"]
          updated_at?: string
        }
        Relationships: []
      }
      social_security_config: {
        Row: {
          ceiling_amount: number | null
          created_at: string
          employer_rate: number | null
          fiscal_year: string
          id: string
          is_active: boolean | null
          name: string
          rate: number
        }
        Insert: {
          ceiling_amount?: number | null
          created_at?: string
          employer_rate?: number | null
          fiscal_year: string
          id?: string
          is_active?: boolean | null
          name: string
          rate: number
        }
        Update: {
          ceiling_amount?: number | null
          created_at?: string
          employer_rate?: number | null
          fiscal_year?: string
          id?: string
          is_active?: boolean | null
          name?: string
          rate?: number
        }
        Relationships: []
      }
      tax_slabs: {
        Row: {
          created_at: string
          description: string | null
          fiscal_year: string
          fixed_tax: number
          id: string
          is_active: boolean | null
          max_income: number | null
          min_income: number
          tax_rate: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          fiscal_year: string
          fixed_tax?: number
          id?: string
          is_active?: boolean | null
          max_income?: number | null
          min_income: number
          tax_rate?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          fiscal_year?: string
          fixed_tax?: number
          id?: string
          is_active?: boolean | null
          max_income?: number | null
          min_income?: number
          tax_rate?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_logs: {
        Row: {
          action_result: Json | null
          action_taken: string
          created_at: string | null
          error_message: string | null
          id: string
          rule_id: string | null
          status: string | null
          trigger_data: Json | null
          trigger_event: string
        }
        Insert: {
          action_result?: Json | null
          action_taken: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          rule_id?: string | null
          status?: string | null
          trigger_data?: Json | null
          trigger_event: string
        }
        Update: {
          action_result?: Json | null
          action_taken?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          rule_id?: string | null
          status?: string | null
          trigger_data?: Json | null
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "workflow_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_rules: {
        Row: {
          action_config: Json | null
          action_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_conditions: Json | null
          trigger_event: string
          updated_at: string | null
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_conditions?: Json | null
          trigger_event: string
          updated_at?: string | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_conditions?: Json | null
          trigger_event?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "hr_admin" | "manager" | "employee"
      salary_component_type: "earning" | "deduction" | "employer_contribution"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "hr_admin", "manager", "employee"],
      salary_component_type: ["earning", "deduction", "employer_contribution"],
    },
  },
} as const
