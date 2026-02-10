export declare class UpdateStatusDto {
    new_status: 'SOLICITADA' | 'AGENDADA' | 'REALIZADA' | 'CANCELADA' | 'APROBADA' | 'RECHAZADA';
    note?: string;
    scheduled_start_at?: string;
    scheduled_end_at?: string;
    assigned_investigator_user_id?: number;
    cancellation_reason?: string;
}
