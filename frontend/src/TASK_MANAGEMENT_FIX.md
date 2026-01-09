// Fix for employee dropdown issue in create task modal

// In TaskManagementPage.js, replace the "Assigned To" field in create modal:

// OLD (BROKEN):
<Form.Group className="mb-3">
    <Form.Label>Assigned To *</Form.Label>
    <Form.Control
        as="select"
        name="assigned_to"
        value={taskForm.assigned_to}
        onChange={(e) => setTaskForm({...taskForm, assigned_to: e.target.value})}
        required
    >
        <option value="">Select Employee</option>
        {taskHelpers.getEmployeeOptions().map(option => (
            <option key={option.value} value={option.value}>
                {option.label}
            </option>
        ))}
    </Form.Control>
</Form.Group>

// NEW (WORKING):
<Form.Group className="mb-3">
    <Form.Label>Assigned To *</Form.Label>
    <Form.Control
        as="select"
        name="assigned_to"
        value={taskForm.assigned_to}
        onChange={(e) => {
            const selectedEmployee = employees.find(emp => emp.id === parseInt(e.target.value));
            console.log('📝 Create Modal: Selected employee:', selectedEmployee);
            setTaskForm({...taskForm, assigned_to: e.target.value});
            setSelectedEmployee(selectedEmployee);
        }}
        required
    >
        <option value="">Select Employee</option>
        {employees.map(employee => (
            <option key={employee.id} value={employee.id}>
                {employee.first_name} {employee.last_name} ({employee.role})
            </option>
        ))}
    </Form.Control>
</Form.Group>

// AND add this to handleCreateTask:
const handleCreateTask = async (e) => {
    e.preventDefault();
    
    // Use taskValidation for form validation
    if (!taskValidation.validateTaskForm(taskForm)) {
        console.log('❌ TaskManagementPage: Form validation failed');
        return;
    }

    taskErrorHandling.setLoading(setLoading, true);
    
    try {
        // Use taskApiService for API calls
        const createdTask = await taskApiService.createTask(taskForm);
        console.log('✅ TaskManagementPage: Task created successfully:', createdTask);
        
        // Reset form and close modal
        resetTaskForm();
        setShowCreateModal(false);
        setSelectedEmployee(null);
        fetchTasks();
        fetchStats();
        
        taskErrorHandling.handleSuccess('Task created successfully');
    } catch (err) {
        console.error('❌ TaskManagementPage: Error creating task:', err);
        setError('Failed to create task');
        taskErrorHandling.handleTaskError(err);
    } finally {
        taskErrorHandling.setLoading(setLoading, false);
        console.log('✅ TaskManagementPage: Task creation process completed');
    }
};

// Debugging console.log to verify:
console.log('🔍 TaskManagementPage: Current employees state:', employees);
console.log('🔍 TaskManagementPage: Current selectedEmployee:', selectedEmployee);