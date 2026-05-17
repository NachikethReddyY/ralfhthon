const { validationError } = require('./authValidation');

const ALLOWED_TYPES = ['hardware', 'software', 'bug'];
const ALLOWED_PRIORITIES = ['P1', 'P2', 'P3', 'P4'];
const ALLOWED_STATUSES = [
  'open',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
  'on_hold',
  'pending_routing',
];

function validateTicketCreateBody(body) {
  const details = {};
  const title = String(body?.title ?? '').trim();
  const description = String(body?.description ?? '').trim();
  const categoryId = String(body?.categoryId ?? body?.category_id ?? '').trim();
  const type = String(body?.type ?? '').trim().toLowerCase();
  const priority = String(body?.priority ?? '').trim().toUpperCase();
  const replicationSteps = body?.replicationSteps == null ? null : String(body.replicationSteps).trim();

  if (!title) details.title = 'Title is required';
  else if (title.length > 255) details.title = 'Title must be 255 characters or fewer';

  if (!description) details.description = 'Description is required';
  if (!categoryId) details.categoryId = 'Category is required';
  if (!ALLOWED_TYPES.includes(type)) details.type = 'Type must be hardware, software, or bug';
  if (!ALLOWED_PRIORITIES.includes(priority)) details.priority = 'Priority must be P1, P2, P3, or P4';

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    value: {
      title,
      description,
      categoryId,
      type,
      priority,
      replicationSteps,
    },
  };
}

function validateTicketStatusBody(body) {
  const status = String(body?.status ?? '').trim();
  if (!ALLOWED_STATUSES.includes(status)) {
    return { ok: false, details: { status: 'Status is invalid' } };
  }
  return { ok: true, value: { status } };
}

function validateTicketAssignmentBody(body) {
  const assignedTo = String(body?.assignedTo ?? body?.assigned_to ?? '').trim();
  if (!assignedTo) {
    return { ok: false, details: { assignedTo: 'Assigned user is required' } };
  }
  return { ok: true, value: { assignedTo } };
}

function validateCategoryBody(body) {
  const details = {};
  const name = String(body?.name ?? '').trim();
  const description = body?.description == null ? null : String(body.description).trim();
  const isActive = body?.isActive ?? body?.is_active;

  if (!name) details.name = 'Name is required';
  else if (name.length > 100) details.name = 'Name must be 100 characters or fewer';

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    details.isActive = 'isActive must be true or false';
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    value: {
      name,
      description,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    },
  };
}

function validateRatingBody(body) {
  const details = {};
  const rating = Number(body?.rating);
  const comment = body?.comment == null ? null : String(body.comment).trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    details.rating = 'Rating must be an integer between 1 and 5';
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }
  return { ok: true, value: { rating, comment } };
}

module.exports = {
  ALLOWED_STATUSES,
  validationError,
  validateCategoryBody,
  validateRatingBody,
  validateTicketAssignmentBody,
  validateTicketCreateBody,
  validateTicketStatusBody,
};

