// frontend/src/components/AddInventory.js

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Select from 'react-select';

const schema = yup.object().shape({
  name: yup.string().required('Name is required'),
  purchase_value: yup.number().required('Purchase Value is required').positive('Must be positive'),
  category: yup.object().required('Category is required').nullable(),
  // Add other validations as needed (e.g., purchase_date as date)
});

const AddInventory = ({
  mode = 'add',
  initialValues = {},
  onSubmit,
  onCancel,
  categories = [],
  availableUsers = [],
  statusOptions = [],
  isSubmitting = false,
}) => {
  const { register, handleSubmit, control, formState: { errors }, reset } = useForm({
    resolver: yupResolver(schema),
    defaultValues: initialValues,
  });

  // Reset form with initialValues when they change (for edit mode)
  React.useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <input
            {...register('name')}
            placeholder="Name"
            className="p-2 border w-full"
            aria-invalid={errors.name ? 'true' : 'false'}
          />
          {errors.name && <span className="text-red-500 text-sm">{errors.name.message}</span>}
        </div>
        <input
          {...register('description')}
          placeholder="Description"
          className="p-2 border w-full"
        />
        <div>
          <input
            type="number"
            {...register('purchase_value')}
            placeholder="Purchase Value"
            className="p-2 border w-full"
            aria-invalid={errors.purchase_value ? 'true' : 'false'}
          />
          {errors.purchase_value && <span className="text-red-500 text-sm">{errors.purchase_value.message}</span>}
        </div>
        <input
          type="date"
          {...register('purchase_date')}
          className="p-2 border w-full"
        />
        <select
          {...register('status')}
          className="p-2 border w-full"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                options={categories}
                placeholder="Category"
                aria-invalid={errors.category ? 'true' : 'false'}
              />
            )}
          />
          {errors.category && <span className="text-red-500 text-sm">{errors.category.message}</span>}
        </div>
        <Controller
          name="assigned_to"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={availableUsers}
              placeholder="Assigned To"
              isClearable
            />
          )}
        />
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? (mode === 'add' ? 'Adding...' : 'Updating...') : (mode === 'add' ? 'Add' : 'Update')}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default AddInventory;