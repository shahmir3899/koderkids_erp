# Create a fixed version of the models.py save method

def save(self, *args, **kwargs):
        from datetime import datetime
        
        # Set completed_date when status is changed to completed
        if self.status == 'completed' and not self.completed_date:
            self.completed_date = timezone.now()
        elif self.status != 'completed':
            self.completed_date = None
        
        # Check if task is overdue
        if self.due_date and self.status not in ['completed', 'overdue']:
            # Handle string datetime comparison
            due_date = self.due_date
            if isinstance(due_date, str):
                try:
                    due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                except ValueError:
                    pass  # Keep original if parsing fails
            
            if isinstance(due_date, datetime) and timezone.now() > due_date:
                self.status = 'overdue'
        
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        if self.due_date and self.status not in ['completed']:
            return timezone.now() > self.due_date if timezone.now() > self.due_date else False
        return False