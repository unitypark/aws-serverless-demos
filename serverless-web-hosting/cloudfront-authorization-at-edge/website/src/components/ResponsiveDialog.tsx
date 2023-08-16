import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export type SessionExpiredDialogProps = {
  title: string;
  description: string;
  buttonText: string;
  open: boolean;
};

const handleClose = () => {
  window.location.reload();
};

const SessionExpiredDialog = ({ title, description, buttonText, open }: SessionExpiredDialogProps) => {
  return (
    <>
      <div>
        <Dialog
          open={open}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">
            {title}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              {description}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} autoFocus>
              {buttonText}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </>
  );
}

export default SessionExpiredDialog;